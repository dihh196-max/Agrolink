import type { Database } from '@agrolink/database'
import { externalJobs } from '@agrolink/database'
import { lt } from 'drizzle-orm'

// Queries without country filter — JSearch indexes Brazilian job boards
// when the query is in Portuguese; country=br often returns 0 results
const AGRO_QUERIES = [
  'engenheiro agronomo',
  'tecnico agricola',
  'agronomia agronegocio',
  'veterinario fazenda pecuaria',
  'operador maquinas agricolas',
  'gestor rural agropecuaria',
]

const EMPLOYMENT_MAP: Record<string, string> = {
  FULLTIME: 'permanent',
  PARTTIME: 'service',
  INTERN: 'internship',
  CONTRACTOR: 'service',
}

export async function collectExternalJobs(db: Database): Promise<void> {
  const apiKey = process.env.JSEARCH_API_KEY
  if (!apiKey) {
    console.log('[jobs] JSEARCH_API_KEY not set — skipping external job collection')
    return
  }

  const collected: typeof externalJobs.$inferInsert[] = []

  for (const query of AGRO_QUERIES) {
    try {
      // Removed country=br (too restrictive) and date_posted=month (reduces results)
      const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&num_pages=1&page=1`
      const res = await fetch(url, {
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
        },
      })

      if (!res.ok) {
        console.error(`[jobs] JSearch error for "${query}": ${res.status} ${await res.text().catch(() => '')}`)
        continue
      }

      const json = (await res.json()) as { data?: any[]; status?: string }
      console.log(`[jobs] "${query}": status=${json.status} count=${json.data?.length ?? 0}`)
      const items = json.data ?? []

      for (const item of items) {
        if (!item.job_apply_link || !item.job_title || !item.employer_name) continue
        if (!item.job_description || item.job_description.length < 30) continue

        collected.push({
          externalId: item.job_id,
          title: item.job_title,
          company: item.employer_name,
          companyLogo: item.employer_logo ?? null,
          description: item.job_description.slice(0, 4000),
          employmentType: EMPLOYMENT_MAP[item.job_employment_type] ?? 'permanent',
          city: item.job_city ?? null,
          state: item.job_state ?? null,
          country: item.job_country ?? 'BR',
          salaryMin: item.job_min_salary ?? null,
          salaryMax: item.job_max_salary ?? null,
          salaryCurrency: item.job_salary_currency ?? 'BRL',
          applyUrl: item.job_apply_link,
          source: 'jsearch',
          keywords: [query],
          requiredSkills: Array.isArray(item.job_required_skills)
            ? item.job_required_skills.slice(0, 10)
            : null,
          postedAt: item.job_posted_at_datetime_utc
            ? new Date(item.job_posted_at_datetime_utc)
            : null,
          expiresAt: null,
          cachedAt: new Date(),
        })
      }

      // Respect rate limits
      await new Promise((r) => setTimeout(r, 600))
    } catch (e) {
      console.error(`[jobs] Failed to fetch for query "${query}":`, e)
    }
  }

  console.log(`[jobs] Total collected before upsert: ${collected.length}`)

  for (const job of collected) {
    await db
      .insert(externalJobs)
      .values(job)
      .onConflictDoUpdate({
        target: externalJobs.externalId,
        set: {
          title: job.title,
          description: job.description,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          cachedAt: new Date(),
        },
      })
      .catch((e) => console.error('[jobs] upsert error:', e))
  }

  // Remove entries older than 30 days (fixed: lt instead of eq)
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  await db.delete(externalJobs).where(lt(externalJobs.cachedAt, cutoff)).catch(() => {})

  console.log(`[jobs] Collected and saved ${collected.length} external jobs`)
}
