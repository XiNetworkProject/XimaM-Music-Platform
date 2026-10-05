import { NextResponse, type NextRequest } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { withDatabaseTransaction, type DatabaseExecutor } from '@/lib/postgres';
import { BoosterError } from './service';

/** Commit only a successful operation; any error rolls back every reward write. */
export async function boosterMutation(
  operation: (db: DatabaseExecutor, userId: string) => Promise<unknown>,
  request?: NextRequest
) {
  try {
    const session = request ? await getApiSession(request) : await getServerSession(authOptions);
    if (!session?.user?.id)
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const userId = session.user.id;
    const result = await withDatabaseTransaction((db) => operation(db, userId));
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof BoosterError)
      return NextResponse.json(
        { error: error.message, ...error.details },
        { status: error.status }
      );
    console.error(
      '[boosters] transaction interrompue',
      error instanceof Error ? error.name : 'UnknownError'
    );
    return NextResponse.json(
      {
        error:
          'Opération indisponible. Aucune modification n’a été enregistrée.',
      },
      { status: 500 }
    );
  }
}
