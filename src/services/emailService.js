import { callApi } from './callApi'

export const sendOutfitCreatedEmail = async (to, userName, outfitNames) => {
  try {
    const result = await callApi('sendOutfitCreatedEmail', { to, userName, outfitNames })
    return result
  } catch (error) {
    console.error('Send outfit email error:', error)
    return { success: false, error: error.message }
  }
}
