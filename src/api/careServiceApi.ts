import apiClient from '../lib/apiClient'
import type { CareServiceCatalogItem } from '../types/careService'

export const careServiceApi = {
  async getCatalog(domain?: string): Promise<CareServiceCatalogItem[]> {
    const response = await apiClient.get<CareServiceCatalogItem[]>('/api/care-services/catalog', domain ? { params: { domain } } : undefined)
    return response.data
  },
}
