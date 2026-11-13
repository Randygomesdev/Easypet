import { api } from '../lib/api'

export const uploadService = {
  uploadImage: (file: File): Promise<string> => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/files/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data?.url ?? r.data)
  },
}
