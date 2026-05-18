export type Message = {
    id: string
    sender_name: string | null
    sender_email: string | null
    thread_id?: string | null
    message_external_id?: string | null
    subject: string | null
    body_raw: string | null
    inbox_id?: string | null
    timestamp?: number | null
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
    original_draft_text?: string | null
    edited_text?: string | null
    tone_confidence: number | null
    status?: string | null
    version?: number | null
    context_sources?: string[] | null
    sender_persona?: string | null
    subject_line?: string | null
    created_at?: string | null
}