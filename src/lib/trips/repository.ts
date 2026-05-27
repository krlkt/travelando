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
}
