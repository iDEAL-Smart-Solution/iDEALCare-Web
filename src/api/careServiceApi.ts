import apiClient from '../lib/apiClient'
import type { CareServiceCatalogItem } from '../types/careService'

export const careServiceApi = {
  async getCatalog(): Promise<CareServiceCatalogItem[]> {
    const response = await apiClient.get<CareServiceCatalogItem[]>('/api/care-services/catalog')
    return response.data
  },
}
