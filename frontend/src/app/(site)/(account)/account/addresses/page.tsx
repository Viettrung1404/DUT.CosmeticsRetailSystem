import { requireUser } from "@/shared/auth/guard";
import { getAddresses } from "@/features/addresses/server";
import { AddressBook } from "@/features/addresses/address-book";
export const metadata = { title: "Sổ địa chỉ" };
export default async function AddressesPage() {
  const user = await requireUser("/account/addresses");
  return <AddressBook initial={await getAddresses()} userId={user.id} />;
}
