import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

export async function recoverFixtures(root, env, project, compose) {
  const temp = await mkdtemp(join(tmpdir(), 'easypet-wave-b-recovery-'))
  const database = (name, query) => compose(['exec', '-T', `${name}-db`, 'psql', '-XAtq',
    '-v', 'ON_ERROR_STOP=1', '-U', name, '-d', `${name}_db`, '-c', query],
  { stdio: ['ignore', 'pipe', 'inherit'] }).stdout.trim()
  const uuid = (value, label) => {
    if (!/^[a-f\d-]{36}$/i.test(value)) throw new Error(`Fixture de recuperação ausente: ${label}.`)
    return `'${value}'::uuid`
  }
  const command = args => {
    const child = spawnSync(process.execPath, ['scripts/production/database.mjs', ...args], {
      cwd: root, env, stdio: 'inherit',
    })
    if (child.error) throw child.error
    if (child.status !== 0) throw new Error(`Ensaio de recuperação falhou (${child.status}).`)
  }
  try {
    compose(['stop', 'frontend', 'gateway-service', 'notification-service', 'booking-service',
      'payment-service', 'pet-service', 'partner-service', 'auth-service'])
    const user = uuid(database('auth', "SELECT id FROM users WHERE email = 'notificacao@example.test'"), 'tutor')
    const bookingRow = database('booking', `SELECT row_to_json(b) FROM (
      SELECT id, user_id, partner_id, pet_id, status FROM bookings
      WHERE user_id = ${user} AND status = 'CANCELLED' ORDER BY id LIMIT 1) b`)
    if (!bookingRow) throw new Error('Recuperação representativa exige a reserva cancelada pelo cenário de Notification.')
    const booking = JSON.parse(bookingRow)
    const booked = uuid(booking.id, 'reserva de tutor')
    const pet = uuid(booking.pet_id, 'pet')
    const partner = uuid(booking.partner_id, 'estabelecimento')
    const paid = uuid(database('payment', `SELECT c.id FROM cashier_charges c
      JOIN cashier_movements m ON m.charge_id = c.id AND m.partner_id = c.partner_id
      WHERE c.description = 'Caixa Onda B' AND m.type = 'RECEIPT' AND m.amount_cents = 4000`), 'cobrança de balcão com baixa')
    const cashierBooking = uuid(database('payment', `SELECT booking_id FROM cashier_charges WHERE id = ${paid}`), 'reserva do caixa')
    const desk = JSON.parse(database('booking', `SELECT row_to_json(b) FROM (
      SELECT pet_id, partner_id, reception_customer_id FROM bookings WHERE id = ${cashierBooking}) b`))
    const deskPet = uuid(desk.pet_id, 'pet de balcão')
    const customer = uuid(desk.reception_customer_id, 'cadastro de balcão')
    const deskPartner = uuid(desk.partner_id, 'estabelecimento de balcão')
    const claimUser = uuid(database('auth', "SELECT id FROM users WHERE email = 'reivindicacao@example.test'"), 'tutor vinculado')
    const receiver = uuid(database('auth', "SELECT id FROM users WHERE email = 'equipe-reception@example.test'"), 'operador de caixa')
    const outbox = uuid(database('booking', `SELECT event_id FROM booking_outbox WHERE booking_id = ${booked}
      AND event_type = 'BOOKING_CONFIRMED' AND acknowledged_at IS NOT NULL`), 'evento confirmado com ACK')
    const queries = {
      auth: [`SELECT id, role, active FROM users WHERE id = ${user}`,
        `SELECT id, role, active FROM users WHERE id = ${claimUser}`,
        `SELECT id, user_id, partner_id, status FROM team_accesses WHERE user_id = ${receiver}
          AND partner_id = ${deskPartner}`],
      pet: [`SELECT id, owner_id FROM pets WHERE id = ${pet} AND owner_id = ${user}`,
        `SELECT id, reception_customer_id, reception_partner_id FROM pets WHERE id = ${deskPet}
          AND reception_customer_id = ${customer} AND reception_partner_id = ${deskPartner}`],
      partner: [`SELECT id, user_id FROM partners WHERE id = ${partner}`,
        `SELECT id, partner_id, claimed_user_id FROM reception_customers WHERE id = ${customer}
          AND partner_id = ${deskPartner} AND claimed_user_id = ${claimUser}`],
      booking: [`SELECT id, user_id, partner_id, pet_id, status FROM bookings WHERE id = ${booked}`,
        `SELECT id, partner_id, pet_id, reception_customer_id FROM bookings WHERE id = ${cashierBooking}`,
        `SELECT event_id, booking_id, user_id, booking_version, acknowledged_at AT TIME ZONE 'UTC'
          FROM booking_outbox WHERE event_id = ${outbox} AND booking_id = ${booked}`],
      payment: [`SELECT c.id, c.partner_id, c.booking_id, m.id, m.amount_cents, m.created_by
        FROM cashier_charges c JOIN cashier_movements m ON m.charge_id = c.id AND m.partner_id = c.partner_id
        WHERE c.id = ${paid} AND c.partner_id = ${deskPartner}
          AND (m.created_by = ${receiver} OR m.type = 'REVERSAL') ORDER BY m.id`],
      notification: [`SELECT e.id, e.booking_id, e.booking_version, d.id, d.type, d.status
        FROM notification_event e JOIN notification_delivery d ON d.event_id = e.id
        WHERE e.id = ${outbox} AND e.booking_id = ${booked} ORDER BY d.id`],
    }
    const evidence = {}
    for (const [name, checks] of Object.entries(queries)) {
      evidence[name] = checks.map(query => {
        const expected = database(name, query)
        if (!expected) throw new Error(`Sem registro de referência em ${name}.`)
        return { query, expected }
      })
    }
    const envFile = join(temp, 'compose.env')
    const evidenceFile = join(temp, 'evidence.json')
    const backup = join(temp, 'backup')
    await writeFile(envFile, '', { mode: 0o600 })
    await writeFile(evidenceFile, JSON.stringify(evidence), { mode: 0o600 })
    command(['backup', '--project', project, '--env-file', envFile, '--directory', backup])
    if (process.env.E2E_H1 === '1') {
      // The source belongs to this disposable run. The backup retains the previous schema.
      if (!/^easypet-e2e-[a-f0-9]{10}$/.test(project)) throw new Error('Projeto de incidente inválido.')
      const changed = database('booking', `ALTER TABLE bookings RENAME COLUMN reception_customer_id TO h1_incompatible;
        SELECT count(*) FROM bookings WHERE h1_incompatible IS NOT NULL`)
      if (!Number(changed)) throw new Error('A simulação de migration não atingiu reservas de balcão.')
      const legacyColumn = database('booking', `SELECT count(*) FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'reception_customer_id'`)
      if (legacyColumn !== '0') throw new Error('A coluna legada permaneceu visível após a migration incompatível.')
      console.log('Incidente H1: schema incompatível confirmado na origem descartável; restauração pré-migration em destino novo.')
    }
    compose(['stop', 'auth-db', 'pet-db', 'partner-db', 'booking-db', 'payment-db', 'notification-db'])
    command(['restore-drill', '--directory', backup, '--evidence', evidenceFile])
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
}
