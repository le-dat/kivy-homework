import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { ROUTES } from '@/constants';

export default async function SellerIndexPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    redirect(ROUTES.LOGIN);
  }

  redirect(ROUTES.SELLER_DASHBOARD);
}