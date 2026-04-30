import { CategoryBadge } from "./CategoryBadge";
import { formatDistanceToNow, parseISO } from 'date-fns'
import { Message } from "@/app/types/message";

type MessageItemProps = {
    msg: Message,
    isActive: boolean,
    onClick: (msg: Message) => void,
}

const relativeTime = (iso: string) => {
    try { return formatDistanceToNow(parseISO(iso), { addSuffix: false }) }
    catch { return '' }
}

/* Message Item Component */
export function MessageItem({ msg, isActive, onClick }: MessageItemProps) {
    return (
        <div
            className={`message-item px-[16px] py-[14px] border-b border-dpw-border cursor-pointer transition-colors duration-150 bg-transparent hover:bg-dpw-light ${isActive ? 'bg-dpw-gold-light/10 border-dpw-gold' : 'border-transparent'}`}
            key={msg.id}
            onClick={() => onClick(msg)}

        >
            <div className="flex justify-between items-center mb-0.5">
                <div>
                    <h6 className="font-sans font-medium text-[14px] text-dpw-dark">{msg.sender_name ?? 'Unknown'}</h6>
                </div>
                <span className="font-sans text-[10px] text-dpw-muted">
                    {relativeTime(msg.created_at)}
                </span>
            </div>
            <div>
                <h4 className="font-sans font-regular text-[12px] mb-0.5">{msg.subject ?? '(no subject)'}</h4>
            </div>
            <div>
                <p className="font-sans text-[11px] text-dpw-muted">{(msg.body_raw ?? '').substring(0, 80)}</p>
            </div>
            <div className="mt-1">
                <CategoryBadge category={msg.category} />
                {(msg.tier === 3 || (msg.estimated_value != null && msg.estimated_value >= 5000)) && (
                    <CategoryBadge category="high_value" className="ml-2" />
                )}
            </div>
        </div>
    )
} 