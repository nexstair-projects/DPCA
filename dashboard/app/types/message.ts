export type Message = {
    id: string
    sender_name: string | null
    sender_email: string | null
    subject: string | null
    body_raw: string | null
    category: string | null
    priority: string | null
    tier: number | null
    channel: string | null
    estimated_value: number | null
    guest_count: number | null
    confidence_score: number | null
    status: string | null
    created_at: string
    classified_at: string | null
    drafts: Draft[]
}

export type Draft = {
    id: string
    draft_text: string | null
    tone_confidence: number | null
}