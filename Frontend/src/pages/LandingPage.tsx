import { Link } from 'react-router-dom'
import {
  Calendar, ShieldCheck, Clock, ChevronLeft, ChevronRight,
  MessageCircle, MapPin, Phone, Mail, Play
} from 'lucide-react'

import LogoEasypet        from '../assets/LogoEasypet.svg'
import HeroBanner         from '../assets/hero-banner-wide.png'
import PetIllustration    from '../assets/pet-3d-illustration-transparent.png'
import Consulta           from '../assets/Consulta.png'
import Exames             from '../assets/Exames.png'
import BanhoTosa          from '../assets/Banho-e-tosa.png'
import Passeio            from '../assets/Passeio.png'
import Adestramento       from '../assets/Adestramento.png'
import HotelPet           from '../assets/Hotel-pet.png'
import VideoSection       from '../assets/section4 video.png'
import VetTalking         from '../assets/Vet_talking.png'
import Plus               from '../assets/plus.png'

/* ─── Dados ─── */
const services = [
  { img: Consulta,     title: 'Consultas pet',   desc: 'Profissionais veterinários humanizados para garantir a saúde e a prevenção de doenças durante todas as fases da vida, com o carinho que ele merece.' },
  { img: Exames,       title: 'Exames',          desc: 'Conte com diagnósticos precisos por meio de alta tecnologia e laboratório avançado para cuidar de quem importa.' },
  { img: BanhoTosa,    title: 'Banho e Tosa',    desc: 'Limpeza animal com produtos premium e profissionais dedicados em um ambiente seguro, no estilo e super relaxado.' },
  { img: Passeio,      title: 'Passeios',        desc: 'Passeios para seu pet ganhar energia! Cão ou miau, deixe-o muito mais feliz e saudável com nossos passeios especializados.' },
  { img: Adestramento, title: 'Adestramento',    desc: 'Ajudamos seu pet a ser comportado para a vida. Com técnicas humanizadas e baseadas em metodologias modernas.' },
  { img: HotelPet,     title: 'Hotel pet',       desc: 'Hospedagem segura e confortável para o seu pet! Cuidados profissionais para você viajar e não se preocupar.' },
]

const testimonials = [
  { name: 'Gabriela Oliveira', role: 'Tutora da Max',  text: 'O Prontuário Digital acessível no celular me salvou! Durante uma emergência de madrugada o novo veterinário puxou todo o histórico e alergias em segundos.' },
  { name: 'Arthur Becker',     role: 'Tutor da Mia',   text: 'Super fácil de usar. O grande diferencial de ter as prescrições médicas salvas no nuvem evitou que eu perca a rotina de medicações mensais da Mia.' },
  { name: 'Pedro Augusto',     role: 'Tutor do Dino',  text: 'Recebo alertas automáticos de vacinas e os novos veterinários puxam todo o histórico. O site é muito intuitivo e a veterinária não falta.' },
  { name: 'Amanda Jackson',    role: 'Tutora da Luna', text: 'Poder agendar consultas e encontrar clínicas diferentes me deu uma enorme dor de cabeça recomendo para qualquer pai de pet.' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={LogoEasypet} alt="Easypet" className="w-8 h-8" />
            <span className="text-xl font-bold text-[#16426b]">Easypet</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#inicio"   className="hover:text-[#16426b] transition-colors">Início</a>
            <a href="#servicos" className="hover:text-[#16426b] transition-colors">Serviços</a>
            <a href="#contato"  className="hover:text-[#16426b] transition-colors">Contato</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/login"
              className="hidden sm:block px-4 py-2 text-sm font-semibold text-[#16426b]
                         border border-[#16426b] rounded-full hover:bg-blue-50 transition-colors">
              Login
            </Link>
            <Link to="/login"
              className="px-4 py-2 text-sm font-semibold text-white bg-secondary-500
                         rounded-full hover:bg-secondary-600 transition-colors">
              Nova Conta
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section id="inicio" className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Background image */}
        <img
          src={HeroBanner}
          alt="Hero"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-transparent" />

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 w-full flex flex-col justify-between min-h-[90vh]">
          <div className="max-w-xl">
            <span className="text-secondary-500 text-sm font-semibold uppercase tracking-wide">
              A saúde do seu pet em 1º lugar
            </span>
            <h1 className="mt-3 text-4xl sm:text-5xl font-bold text-primary-700 leading-tight">
              Um sistema completo para você e pro seu pet
            </h1>
            <p className="mt-4 text-gray-500 text-base leading-relaxed">
              Agenda consultas veterinárias, acompanhe as vacinas e o histórico de saúde do seu melhor amigo em uma plataforma moderna, segura e integrada.
            </p>
            <div className="mt-8">
              <Link to="/login"
                className="inline-block px-8 py-3 bg-primary-700 text-white font-semibold rounded-full text-sm
                           hover:bg-primary-800 transition-colors">
                Faça o seu agendamento
              </Link>
            </div>
          </div>

          {/* Feature badges — dentro do hero, na base */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16">
            {[
              { icon: <Calendar size={20} />,    title: 'Agenda Flexível',            desc: 'Agende no horário que encaixa na sua rotina' },
              { icon: <ShieldCheck size={20} />, title: 'Profissionais verificados',  desc: 'Todos os especialistas são verificados e certificados' },
              { icon: <Clock size={20} />,       title: 'Emergências 24hr',           desc: 'Atendimento de emergência disponível 24 horas' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3 bg-[#16426b]/90 backdrop-blur text-white rounded-2xl p-4">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  {icon}
                </div>
                <div>
                  <p className="font-semibold text-sm">{title}</p>
                  <p className="text-white/70 text-xs mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Serviços ── */}
      <section id="servicos" className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-12 mb-14">
            <div className="flex-1">
              <span className="text-secondary-500 text-sm font-semibold uppercase tracking-wide">Serviços</span>
              <h2 className="mt-2 text-3xl lg:text-4xl font-bold text-primary-700 leading-tight">
                Tudo o que o seu pet precisa em um único lugar
              </h2>
              <p className="mt-4 text-gray-500 text-sm leading-relaxed">
                Cuidado especializado em cada etapa, seja na hora do banho, nos passeios ou durante as consultas.
              </p>
            </div>
            <div className="flex-1 flex justify-center">
              <img src={PetIllustration} alt="Pet ilustração" className="w-72 lg:w-96 object-contain" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map(({ img, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-full h-44 rounded-xl mb-4 overflow-hidden bg-white flex items-center justify-center">
                  <img src={img} alt={title} className="h-full object-contain" />
                </div>
                <h3 className="font-bold text-[#16426b] mb-2">{title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-16"
        style={{ background: 'linear-gradient(135deg, #3b5bdb 0%, #16426b 100%)' }}>
        <div className="max-w-4xl mx-auto px-6 text-center text-white relative">
          <img src={Plus} alt="" className="absolute -top-6 left-8 w-10 opacity-40 hidden lg:block" />
          <img src={Plus} alt="" className="absolute -bottom-6 right-8 w-10 opacity-40 hidden lg:block" />

          <h2 className="text-2xl sm:text-3xl font-bold leading-snug">
            A saúde do seu pet a apenas um clique de distância
          </h2>
          <p className="mt-4 text-white/70 text-sm max-w-xl mx-auto">
            Chegou às ligações domésticas e humanas. No EasyPet você encontra os melhores médicos veterinários e agenda consultas (presenciais ou online) com confirmação imediata.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/login"
              className="px-6 py-3 border border-white text-white font-semibold rounded-full text-sm
                         hover:bg-white/10 transition-colors w-full sm:w-auto text-center">
              Agendar serviço
            </Link>
            <Link to="/login"
              className="px-6 py-3 bg-secondary-500 text-white font-semibold rounded-full text-sm
                         hover:bg-secondary-600 transition-colors w-full sm:w-auto text-center">
              Criar nova conta
            </Link>
          </div>
        </div>
      </section>

      {/* ── Seja Parceiro CTA ── */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-gray-50 rounded-3xl overflow-hidden flex flex-col lg:flex-row">

            {/* Conteúdo — esquerda */}
            <div className="flex-1 p-8 lg:p-12">
              <span className="text-secondary-500 text-sm font-semibold uppercase tracking-wide">
                Para profissionais
              </span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-primary-700 leading-snug">
                Faça parte da maior rede de cuidados com pets do Brasil
              </h2>
              <p className="mt-4 text-gray-500 text-sm leading-relaxed max-w-lg">
                Cadastre sua clínica, petshop ou consultório na plataforma Easypet e alcance milhares de tutores na sua região. Gerencie agendamentos, prontuários e pagamentos em um só lugar.
              </p>
              <ul className="mt-6 flex flex-col gap-2">
                {[
                  'Visibilidade para milhares de tutores',
                  'Gestão completa de agendamentos',
                  'Prontuários digitais integrados',
                  'Receba pagamentos pela plataforma',
                ].map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-5 h-5 rounded-full bg-primary-700 flex items-center justify-center shrink-0">
                      <ShieldCheck size={12} className="text-white" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link to="/seja-parceiro"
                  className="px-8 py-3 bg-secondary-500 text-white font-bold rounded-full text-sm
                             hover:bg-secondary-600 transition-colors text-center shadow-md">
                  Quero ser parceiro
                </Link>
                <a href="#contato"
                  className="px-8 py-3 border border-primary-700 text-primary-700 font-semibold rounded-full
                             text-sm hover:bg-blue-50 transition-colors text-center">
                  Saiba mais
                </a>
              </div>
            </div>

            {/* Imagem — direita, ocupa toda a altura do card */}
            <div className="hidden lg:block w-80 xl:w-96 shrink-0">
              <img
                src={VetTalking}
                alt="Veterinária"
                className="w-full h-full object-cover"
              />
            </div>

          </div>
        </div>
      </section>

      {/* ── Porque o Easypet ── */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <span className="text-secondary-500 text-sm font-semibold uppercase tracking-wide">
            Porque escolher o Easypet?
          </span>
          <div className="mt-6 relative rounded-2xl overflow-hidden cursor-pointer group">
            <img src={VideoSection} alt="Vídeo Easypet" className="w-full object-cover" />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center
                            group-hover:bg-black/40 transition-colors">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg">
                <Play size={24} className="text-primary-700 ml-1" fill="#16426b" />
              </div>
            </div>
          </div>
          <h2 className="mt-10 text-2xl sm:text-3xl font-bold text-primary-700">
            A dedicação ao seu pet é a nossa missão
          </h2>
          <p className="mt-4 text-gray-500 text-sm leading-relaxed max-w-2xl mx-auto">
            Nós sabemos que seu pet é parte fundamental da família. Por isso, monitoramos uma plataforma inovadora que conecta tutores apaixonados aos profissionais mais qualificados da medicina veterinária. Garantimos um acompanhamento de saúde seguro, transparente e construído na base da confiança mútua.
          </p>
        </div>
      </section>

      {/* ── Depoimentos ── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-primary-700">
              O que os tutores dizem sobre os especialistas do EasyPet
            </h2>
            <p className="mt-3 text-gray-500 text-sm">
              Descubra como nossa plataforma tem transformado a vida dos tutores e facilitado os cuidados diários.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {testimonials.map(({ name, role, text }) => (
              <div key={name} className="bg-gray-50 rounded-2xl p-5 flex flex-col gap-4">
                <p className="text-gray-600 text-sm leading-relaxed italic">"{text}"</p>
                <div className="flex items-center gap-3 mt-auto">
                  <div className="w-9 h-9 rounded-full bg-primary-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-primary-700">{name}</p>
                    <p className="text-xs text-gray-400">{role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-3 mt-8">
            <button className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
              <ChevronLeft size={16} className="text-gray-500" />
            </button>
            <button className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
              <ChevronRight size={16} className="text-gray-500" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer id="contato" className="bg-primary-700 text-white py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 pb-10 border-b border-white/10">

            {/* Logo + info */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src={LogoEasypet} alt="Easypet" className="w-8 h-8" />
                <span className="text-xl font-bold">Easypet</span>
              </div>
              <div className="flex flex-col gap-2 text-sm text-white/60">
                <span className="flex items-center gap-2"><MapPin size={14} /> Av. Rio Branco, 200, Florianópolis</span>
                <span className="flex items-center gap-2"><Phone size={14} /> (48) 99807-1136</span>
                <span className="flex items-center gap-2"><Mail size={14} /> contato@easypet.com.br</span>
              </div>
              <div className="flex gap-4 mt-5">
                {[MessageCircle, Phone].map((Icon, i) => (
                  <a key={i} href="#" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                    <Icon size={15} />
                  </a>
                ))}
              </div>
            </div>

            {/* Empresa */}
            <div>
              <p className="font-semibold mb-4">Empresa</p>
              <ul className="flex flex-col gap-2 text-sm text-white/60">
                {['Sobre nós', 'Serviços', 'Blog'].map(item => (
                  <li key={item}><a href="#" className="hover:text-white transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>

            {/* Agende agora */}
            <div>
              <p className="font-semibold mb-4">Agende agora</p>
              <ul className="flex flex-col gap-2 text-sm text-white/60">
                {['Agendamentos', 'Parceiros'].map(item => (
                  <li key={item}><a href="#" className="hover:text-white transition-colors">{item}</a></li>
                ))}
                <li>
                  <Link to="/seja-parceiro" className="hover:text-white transition-colors text-secondary-500 font-medium">
                    Seja Parceiro
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contato */}
            <div>
              <p className="font-semibold mb-4">Contato</p>
              <ul className="flex flex-col gap-2 text-sm text-white/60">
                <li>contato@easypet.com.br</li>
                <li>Phone: (48) 99807-1136</li>
              </ul>
            </div>
          </div>

          <p className="text-center text-xs text-white/40 mt-8">
            © Copyright 2026 — Designed by{' '}
            <span className="text-secondary-500 hover:text-white transition-colors cursor-pointer">InnkerCode</span>
          </p>
        </div>
      </footer>

    </div>
  )
}
