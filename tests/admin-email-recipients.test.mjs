import test from 'node:test';
import assert from 'node:assert/strict';

const recipients = await import('../lib/adminEmailRecipients.ts');

test('compte uniquement les profils ayant une adresse profil ou auth recuperable', async () => {
  const executor = {
    async query(sql, values) {
      assert.match(sql, /LEFT JOIN auth\.users u ON u\.id = p\.id/);
      assert.match(sql, /COALESCE\(NULLIF\(BTRIM\(p\.email\)/);
      assert.deepEqual(values, []);
      return { rows: [{ count: 32 }], rowCount: 1 };
    },
  };

  assert.equal(await recipients.countAdminEmailRecipients(executor), 32);
});

test('restreint une campagne aux identifiants choisis sans interpolation SQL', async () => {
  const selectedIds = ['f64a1b7a-c261-4ad5-955b-c0ad06a1d0bb'];
  const executor = {
    async query(sql, values) {
      assert.match(sql, /p\.id::text = ANY\(\$2::text\[\]\)/);
      assert.deepEqual(values, [true, selectedIds]);
      return {
        rows: [{ id: selectedIds[0], email: 'membre@synaura.fr', name: 'Membre' }],
        rowCount: 1,
      };
    },
  };

  const result = await recipients.getAdminEmailRecipients(selectedIds, executor);
  assert.equal(result[0].email, 'membre@synaura.fr');
});
