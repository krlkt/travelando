import type {
  CityOverride,
  CityOverrideDraft,
  FoodPlace,
  FoodPlaceDraft,
  ItemDraft,
  ItemPatch,
  Trip,
  TripDraft,
  TripItem,
  TripMember,
  TripMemberDraft,
  TripMemberPatch,
} from './types';

export interface TripsRepository {
  findAll(): Promise<Trip[]>;
  findById(id: string): Promise<Trip | null>;
  create(draft: TripDraft): Promise<Trip>;
  update(id: string, patch: Partial<TripDraft>): Promise<Trip>;
  remove(id: string): Promise<void>;
  addItem(tripId: string, draft: ItemDraft): Promise<TripItem>;
  updateItem(
    tripId: string,
    itemId: string,
    patch: ItemPatch,
  ): Promise<TripItem>;
  removeItem(tripId: string, itemId: string): Promise<void>;

  listFoodPlaces(tripId: string): Promise<FoodPlace[]>;
  addFoodPlace(draft: FoodPlaceDraft): Promise<FoodPlace>;
  updateFoodPlace(
    id: string,
    patch: Partial<FoodPlaceDraft>,
  ): Promise<FoodPlace>;
  removeFoodPlace(id: string): Promise<void>;

  listCityOverrides(tripId: string): Promise<CityOverride[]>;
  upsertCityOverride(draft: CityOverrideDraft): Promise<CityOverride>;
  removeCityOverride(id: string): Promise<void>;

  listMembers(tripId: string): Promise<TripMember[]>;
  addMember(tripId: string, draft: TripMemberDraft): Promise<TripMember>;
  updateMember(
    tripId: string,
    memberId: string,
    patch: TripMemberPatch,
  ): Promise<TripMember>;
  removeMember(tripId: string, memberId: string): Promise<void>;
}
