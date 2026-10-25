/**
 * MicroEscrow — Frontend Entry Proxy
 * Note: Whole backend server now runs from backend/app.js.
 * Frontend functionality is divided into modular files:
 *   - frontend/js/api.js        (Backend REST API client)
 *   - frontend/js/campaign.js   (Campaign state & Smart Risk Engine)
 *   - frontend/js/pledge.js     (UPI pledges & modal flow)
 *   - frontend/js/vaultPass.js  (Digital Escrow Vault Pass)
 *   - frontend/js/organizer.js  (Organizer dashboard & audit)
 *   - frontend/js/main.js       (Component loader & bootstrap)
 */

console.log('[MicroEscrow] Modular frontend modules loaded.');
