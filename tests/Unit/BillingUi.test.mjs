import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../../', import.meta.url));
registerHooks({
    resolve(specifier, context, nextResolve) {
        const path = specifier.startsWith('@/')
            ? root + 'resources/js/' + specifier.slice(2)
            : null;
        if (path) {
            const file = [path, path + '.ts', path + '/index.ts'].find(
                (candidate) =>
                    existsSync(candidate) && statSync(candidate).isFile(),
            );
            if (file) return nextResolve(pathToFileURL(file).href, context);
        }
        return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
        return nextLoad(
            url,
            url.endsWith('.json')
                ? { ...context, importAttributes: { type: 'json' } }
                : context,
        );
    },
});

const { normalizeMobileMoneyPhone } =
    await import('../../resources/js/lib/school-mobile-money.ts');
const { buildSubscriptionInvoicePdf } =
    await import('../../resources/js/lib/school-subscription-pdf.ts');

test('mobile money retains the country code and normalizes display separators', () => {
    assert.equal(
        normalizeMobileMoneyPhone('+242 06 123 45 67'),
        '+242061234567',
    );
    assert.equal(
        normalizeMobileMoneyPhone('+242 (05) 123-45-67'),
        '+242051234567',
    );
});

test('mobile money rejects missing country codes, letters and invalid lengths', () => {
    for (const phone of [
        '',
        '061234567',
        '+242ABC061234567',
        '+1',
        '+012345678',
        '+1234567890123456',
    ]) {
        assert.equal(normalizeMobileMoneyPhone(phone), null, phone);
    }
});

function invoice(status = 'paye') {
    return {
        profile: {
            name: 'Complexe Scolaire Les Palmiers',
            address: 'Quartier Moungali, avenue de la Paix',
            city: 'Brazzaville',
            country: 'République du Congo',
            email: 'contact@palmiers.cg',
        },
        receipt: {
            id: 'preview',
            reference: 'INV-PLAT-202609',
            plan: 'platinium',
            periodLabel: 'Septembre 2026',
            amount: 45000,
            status,
            method: 'mobile_money',
            paidOn: status === 'paye' ? '2026-09-03' : null,
        },
    };
}

test('paid receipts use Letter geometry, payment date and a zero balance', () => {
    const doc = buildSubscriptionInvoicePdf(invoice());

    assert.equal(doc.getNumberOfPages(), 1);
    assert.equal(doc.internal.pageSize.getWidth(), 612);
    assert.equal(doc.internal.pageSize.getHeight(), 792);
    assert.match(doc.output(), /03\/09\/2026/);
    assert.match(doc.output(), /0 FCFA/);
    assert.match(doc.output(), /45 000 FCFA/);
    if (process.env.BILLING_PREVIEW_PATH)
        doc.save(process.env.BILLING_PREVIEW_PATH);
});

test('partial invoices do not invent a paid amount or dates', () => {
    const doc = buildSubscriptionInvoicePdf(invoice('partiel'));

    assert.match(doc.output(), /confirmer/);
    assert.doesNotMatch(doc.output(), /03\/09\/2026/);
    assert.match(doc.output(), /Paiement partiel/);
});

test('long billing addresses wrap across lines without adding a page', () => {
    const input = invoice();
    input.profile.address =
        '15 Boulevard de l’Université, Campus Nord, bâtiment administratif, deuxième étage, bureau de la comptabilité';
    const doc = buildSubscriptionInvoicePdf(input);

    assert.equal(doc.getNumberOfPages(), 1);
    assert.match(doc.output(), /Campus Nord/);
});
