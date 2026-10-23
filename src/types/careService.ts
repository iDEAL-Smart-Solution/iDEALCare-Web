export type BookingModel = 1 | 2

export interface CareServiceCatalogItem {
  id: string
  name: string
  description?: string | null
  availableForHomecare: boolean
  availableForFacilityCare: boolean
  price: number
  bookingModel: BookingModel
  requiredInformation?: string | null
  requiredDocuments?: string | null
  assessmentRequirements?: string | null
}
