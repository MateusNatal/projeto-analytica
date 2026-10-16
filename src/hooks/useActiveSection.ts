import { useEffect, useState } from "react"

// Indica qual seção da página está visível, para destacar o item do menu.
export function useActiveSection(ids: string[]): string {
  const [active, setActive] = useState(ids[0] ?? "")
  const key = ids.join(",")

  useEffect(() => {
    const sectionIds = key.split(",")
    const visible = new Map<string, number>()

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visible.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0)
        }

        // A primeira seção (na ordem da página) com parte visível vence.
        const current = sectionIds.find((id) => (visible.get(id) ?? 0) > 0)

        if (current) {
          setActive(current)
        }
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.01, 0.25] }
    )

    for (const id of sectionIds) {
      const element = document.getElementById(id)

      if (element) {
        observer.observe(element)
      }
    }

    return () => observer.disconnect()
  }, [key])

  return active
}
