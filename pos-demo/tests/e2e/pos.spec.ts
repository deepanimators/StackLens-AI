import { test, expect } from '@playwright/test';
import axios from 'axios';

test.describe('POS E2E Scenarios', () => {
    test.beforeAll(async () => {
        // Seed products via backend API directly
        await axios.post('http://localhost:3000/api/products/seed', {
            id: 'p_e2e_noprice',
            name: 'E2E No Price',
            sku: 'E2E-NP',
            price: null,
            stock: 100
        });
        await axios.post('http://localhost:3000/api/products/seed', {
            id: 'p_e2e_normal',
            name: 'E2E Normal',
            sku: 'E2E-N',
            price: 100,
            stock: 100
        });
    });

    test('should trigger PRICE_MISSING scenario', async ({ page }) => {
        await page.goto('/');

        // Wait for products to load
        await expect(page.getByText('E2E No Price')).toBeVisible();

        // Select product
        await page.getByText('E2E No Price').click();

        // Click Place Order
        await page.getByRole('button', { name: 'Place Order' }).click();

        // Expect error message
        await expect(page.getByText('Error: PRICE_MISSING')).toBeVisible();
    });

    test('should place order successfully', async ({ page }) => {
        await page.goto('/');

        await expect(page.getByText('E2E Normal')).toBeVisible();
        await page.getByText('E2E Normal').click();

        await page.getByRole('button', { name: 'Place Order' }).click();

        await expect(page.getByText('Order Confirmed!')).toBeVisible();
    });
});
