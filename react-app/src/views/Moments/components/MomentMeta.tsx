import dayjs from 'dayjs';

import { PinIcon } from '@/components/basic/icon/PinIcon';
import type { Moment } from '@/types';

interface MomentMetaProps {
  moment: Moment;
  volumeLabel?: string;
}

const isPureEmoji = (s: string) => /\p{Extended_Pictographic}/u.test(s);

export function MomentMeta({ moment, volumeLabel }: MomentMetaProps) {
  const raw = moment.published_at ?? moment.created_at;
  const formattedTime = dayjs(raw).format('YYYY-MM-DD HH:mm');
  const mood = moment.mood ?? '';
  const moodIsEmoji = isPureEmoji(mood);

  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] tracking-wide">
      {volumeLabel && (
        <span className="text-foreground/60 font-serif">{volumeLabel}</span>
      )}

      {mood && (
        <span className="inline-flex items-center gap-1">
          <span aria-hidden="true">{moodIsEmoji ? mood : '·'}</span>
          {!moodIsEmoji && (
            <span className="text-foreground/70 italic">{mood}</span>
          )}
        </span>
      )}

      {moment.tags.length > 0 && (
        <span aria-hidden="true" className="text-border">
          ·
        </span>
      )}

      <time className="tabular-nums" dateTime={moment.published_at ?? ''}>
        {formattedTime}
      </time>

      {moment.is_pinned && (
        <span className="text-warning inline-flex items-center gap-1 font-semibold uppercase tracking-[0.18em]">
          <span aria-hidden="true">·</span>
          <PinIcon className="h-3 w-3" />
          <span>置顶</span>
        </span>
      )}
    </div>
  );
}