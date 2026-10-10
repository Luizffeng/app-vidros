import { useEffect, useRef, useState } from 'react'
import type { Banner } from '../data/banners'
import type { Route } from '../nav/routes'
import { useCarouselAutoplay } from './useCarouselAutoplay'

export function BannerCarousel({
  banners,
  onRoute,
}: {
  banners: readonly Banner[]
  onRoute: (route: Route) => void
}) {
  const rootRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  const goTo = (index: number) => {
    const track = trackRef.current
    const slide = track?.children[index] as HTMLElement | undefined
    if (!track || !slide) return
    track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: reduced ? 'auto' : 'smooth' })
  }
  const { reduced } = useCarouselAutoplay(rootRef, banners.length, active, goTo)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const slides = Array.from(track.children)
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(slides.indexOf(entry.target))
        }
      },
      { root: track, threshold: 0.6 },
    )
    for (const slide of slides) observer.observe(slide)
    return () => observer.disconnect()
  }, [banners])

  return (
    <section ref={rootRef} className="carousel" aria-roledescription="carrossel" aria-label="Avisos">
      <div ref={trackRef} className="carousel__track">
        {banners.map((banner, i) => {
          const body = (
            <>
              <span className="carousel__title">{banner.title}</span>
              <span className="carousel__text">{banner.text}</span>
            </>
          )
          const style = banner.image ? { backgroundImage: `url(${banner.image})` } : undefined
          const label = `${i + 1} de ${banners.length}`
          const action = banner.action
          return (
            <div
              key={banner.id}
              className="carousel__slide"
              role="group"
              aria-roledescription="banner"
              aria-label={label}
              style={style}
            >
              {action && 'url' in action ? (
                <a className="carousel__body" href={action.url} target="_blank" rel="noopener noreferrer">
                  {body}
                </a>
              ) : action ? (
                <button type="button" className="carousel__body" onClick={() => onRoute(action.route)}>
                  {body}
                </button>
              ) : (
                <div className="carousel__body">{body}</div>
              )}
            </div>
          )
        })}
      </div>
      {banners.length > 1 && (
        <div className="carousel__dots">
          {banners.map((banner, i) => (
            <button
              key={banner.id}
              type="button"
              className="carousel__dot"
              aria-label={banner.title}
              aria-current={i === active ? 'true' : undefined}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
