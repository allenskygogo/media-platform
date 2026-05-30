export const BOOKING_TIME_SLOTS = [
  { key: '12:00', label: '12:00', time: '約 3 小時' },
  { key: '13:00', label: '13:00', time: '約 3 小時' },
  { key: '14:00', label: '14:00', time: '約 3 小時' },
  { key: '15:00', label: '15:00', time: '約 3 小時' },
  { key: '16:00', label: '16:00', time: '約 3 小時' },
  { key: '17:00', label: '17:00', time: '約 3 小時' },
  { key: '18:00', label: '18:00', time: '約 3 小時' },
]

export const BOOKING_TIME_SLOT_LABELS = Object.fromEntries(
  BOOKING_TIME_SLOTS.map(slot => [slot.key, slot.label])
)
