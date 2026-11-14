// Read the container's own cgroup. This works with Docker Desktop's Linux daemon.
export const cgroupCommand = `
set -e
cd /sys/fs/cgroup
for file in memory.current memory.peak memory.max memory.swap.current memory.swap.max; do
  if [ -r "$file" ]; then printf '%s %s\\n' "$file" "$(cat "$file")"; fi
done
awk '$1 == "anon" || $1 == "file" {print "memory.stat." $0}' memory.stat
awk '{print "memory.events." $0}' memory.events
awk '{print "cpu.stat." $0}' cpu.stat
awk '{print "cpu.max " $0}' cpu.max
awk '/^Threads:/ {print "pid1.threads " $2}' /proc/1/status
`

export function parseCgroup(output) {
  return Object.fromEntries(output.trim().split(/\r?\n/).map(line => {
    const [key, ...fields] = line.split(/\s+/)
    const value = fields.join(' ')
    return [key, /^\d+$/.test(value) ? Number(value) : value]
  }))
}
