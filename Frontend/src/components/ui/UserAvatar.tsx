import { useState } from 'react'

interface Props {
  name:        string
  pictureUrl?: string
  size?:       number
}

export default function UserAvatar({ name, pictureUrl, size = 32 }: Props) {
  const [imgError, setImgError] = useState(false)
  const initial = name.trim().charAt(0).toUpperCase()

  if (pictureUrl && !imgError) {
    return (
      <img
        src={pictureUrl}
        alt={name}
        referrerPolicy="no-referrer"
        style={{ width: size, height: size }}
        className="rounded-full object-cover shrink-0"
        onError={() => setImgError(true)}
      />
    )
  }

  return (
    <div
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      className="rounded-full bg-(--color-primary-700) flex items-center justify-center
                 text-white font-semibold shrink-0 select-none"
    >
      {initial}
    </div>
  )
}
