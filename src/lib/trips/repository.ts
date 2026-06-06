import type { RemoveMemberResult } from './memberRetire';
import type {
  ActivityPlace,
  ActivityPlaceDraft,
  CityOverride,
  CityOverrideDraft,
  Expense,
  ExpenseDraft,
  ExpensePatch,
  FoodPlace,
  FoodPlaceDraft,
  ItemDraft,
  ItemPatch,
  MemberInviteDraft,
  Settlement,
  SettlementDraft,
  Trip,
  TripDraft,
  TripInvitation,
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
  ): Promise<TripItem | null>;
  removeItem(tripId: string, itemId: string): Promise<void>;

  listFoodPlaces(tripId: string): Promise<FoodPlace[]>;
  addFoodPlace(draft: FoodPlaceDraft): Promise<FoodPlace>;
  updateFoodPlace(
    id: string,
    patch: Partial<FoodPlaceDraft>,
  ): Promise<FoodPlace>;
  removeFoodPlace(id: string): Promise<void>;

  listActivityPlaces(tripId: string): Promise<ActivityPlace[]>;
  addActivityPlace(draft: ActivityPlaceDraft): Promise<ActivityPlace>;
  updateActivityPlace(
    id: string,
    patch: Partial<ActivityPlaceDraft>,
  ): Promise<ActivityPlace>;
  removeActivityPlace(id: string): Promise<void>;

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
  // Removes a member. A member with no financial footprint is deleted; one who
  // paid, appears in a split, or settled is retired into a name-only member so
  // expense history and balances stay intact.
  removeMember(tripId: string, memberId: string): Promise<RemoveMemberResult>;
  // Convert an existing (name-only) member into a pending invite, or send a
  // fresh pending invite. Access is granted only once the invitee accepts.
  inviteMember(
    tripId: string,
    memberId: string,
    draft: MemberInviteDraft,
  ): Promise<TripMember>;

  // Invitee-facing: invitations addressed to the current user.
  listMyInvitations(): Promise<TripInvitation[]>;
  acceptInvitation(memberId: string): Promise<string>;
  declineInvitation(memberId: string): Promise<void>;

  listExpenses(tripId: string): Promise<Expense[]>;
  addExpense(draft: ExpenseDraft): Promise<Expense>;
  updateExpense(id: string, patch: ExpensePatch): Promise<Expense>;
  removeExpense(id: string): Promise<void>;

  listSettlements(tripId: string): Promise<Settlement[]>;
  addSettlement(draft: SettlementDraft): Promise<Settlement>;
  removeSettlement(id: string): Promise<void>;
}
