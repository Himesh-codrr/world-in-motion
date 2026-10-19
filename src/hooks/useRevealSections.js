import { useEffect } from 'react'
import { sceneState, subscribeSceneState } from '../components/SceneRig'

export default function useRevealSections(containerRef) {
  useEffect(() => {
    const sections = [...(containerRef.current?.querySelectorAll('.scene') || [])]
    if (!sections.length) return undefined
    const update = (activeIndex = sceneState.index) => {
      sections.forEach((section, index) => {
        const active = index === activeIndex
        section.classList.toggle('is-current', active)
        section.querySelector('[data-reveal]')?.classList.toggle('is-visible', active)
      })
    }
    update()
    return subscribeSceneState(update)
  }, [containerRef])
}
