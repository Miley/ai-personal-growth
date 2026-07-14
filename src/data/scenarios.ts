import type { PracticeScenario } from '../types'

export const SCENARIOS: PracticeScenario[] = [
  {
    id: 'lunch-small-talk',
    category: 'social',
    title: '午饭前的同事',
    setup: '你和一位不太熟的同事在电梯口等午饭。',
    goal: '从共同现场自然开场，再让对方愿意多说一句。',
    partnerOpening: '今天这个会议比我想象中长，我现在只想快点吃到热的东西。',
  },
  {
    id: 'weekend-detail',
    category: 'social',
    title: '接住周末话题',
    setup: '同事主动提到周末，但你不想让对话立刻停住。',
    goal: '接住对方刚说的细节，再追问一个具体点。',
    partnerOpening: '我周末带孩子去看了一个小展，排队排得有点累。',
  },
  {
    id: 'upward-update',
    category: 'upward',
    title: '上级随口问进展',
    setup: '上级在走廊问你：那个项目最近怎么样？',
    goal: '先给一个判断，再说一条依据和一个下一步。',
    partnerOpening: '那个项目最近怎么样？我想知道有没有需要我帮你推进的地方。',
  },
  {
    id: 'meeting-opinion',
    category: 'meeting',
    title: '会议被点名',
    setup: '讨论停住时，主持人问你怎么看。',
    goal: '在 30 秒内说清观点、依据和希望团队做的事。',
    partnerOpening: '这个方向大家意见不太一致。你怎么看？',
  },
]
