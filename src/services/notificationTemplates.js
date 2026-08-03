import { createNotification } from './notificationService'

export const notifyOutfitCreated = async (userId, outfitNames = []) => {
  const names = outfitNames.slice(0, 2)

  await createNotification(userId, {
    title: '✨ Outfit mới đã được tạo!',
    message: `${outfitNames.length} outfit mới: ${names.join(', ')}${outfitNames.length > 2 ? '...' : ''}`,
    type: 'success',
    link: '/outfits'
  })

}

export const notifyRewardReceived = async (userId, count = 2) => {
  await createNotification(userId, {
    title: '🎬 Nhận thưởng thành công!',
    message: `+${count} lượt tạo outfit đã được cộng vào tài khoản.`,
    type: 'success',
    link: '/outfits'
  })
}

export const notifyOutOfGenerations = async (userId) => {
  await createNotification(userId, {
    title: '⚠️ Hết lượt tạo outfit hôm nay',
    message: 'Xem quảng cáo để nhận thêm 2 lượt, hoặc nâng cấp Premium.',
    type: 'warning',
    link: '/outfits'
  })
}

export const notifyAddMoreClothes = async (userId) => {
  await createNotification(userId, {
    title: '👕 Tủ đồ của bạn hơi trống!',
    message: 'Thêm quần áo để AI gợi ý outfit đa dạng hơn.',
    type: 'info',
    link: '/wardrobe'
  })
}
