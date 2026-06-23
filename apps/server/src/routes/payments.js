const express = require("express");
const router = express.Router();

const { requireAuth } = require("../middleware/auth");
const {
  computeQuoteAmount,
  listPaymentsForUser,
} = require("../services/hedera/paymentService");

/**
 * @openapi
 * tags:
 *   - name: Payments
 *     description: Payment pricing and transaction history
 */

/**
 * @openapi
 * /payments/pricing:
 *   get:
 *     tags: [Payments]
 *     summary: Preview task pricing
 *     description: |
 *       Returns the default quote amount for a task type. The task payment endpoint
 *       creates the actual quote and settles it during `/tasks/{id}/pay`.
 *     parameters:
 *       - in: query
 *         name: taskType
 *         required: false
 *         schema:
 *           type: string
 *           example: "execution"
 *       - in: query
 *         name: currency
 *         required: false
 *         schema:
 *           type: string
 *           example: "HBAR"
 *     responses:
 *       200:
 *         description: Pricing preview
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 taskType:
 *                   type: string
 *                   example: "execution"
 *                 currency:
 *                   type: string
 *                   example: "HBAR"
 *                 amount:
 *                   type: string
 *                   example: "0.50"
 */
router.get("/pricing", (req, res) => {
  const taskType = String(req.query.taskType || "execution");
  const currency = String(req.query.currency || "HBAR").toUpperCase();

  return res.json({
    taskType,
    currency,
    amount: computeQuoteAmount(taskType, currency),
  });
});

/**
 * @openapi
 * /payments/history:
 *   get:
 *     tags: [Payments]
 *     summary: Get payment history for authenticated user
 *     description: Returns task payment records including settlement amounts and transaction IDs.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Payment history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "1d95072e-c995-4ecf-8f1a-5db5a3d8a111"
 *                       toAgentId:
 *                         type: string
 *                         example: "ac0d21d5-bb02-4d52-8004-4725488cf007"
 *                       taskExecutionId:
 *                         type: string
 *                         example: "9e75f7fd-fd1c-4b6d-91ab-3ecdb9d8d222"
 *                       amount:
 *                         type: number
 *                         example: 0.5
 *                       amountAtomic:
 *                         type: string
 *                         example: "50000000"
 *                       currency:
 *                         type: string
 *                         example: "HBAR"
 *                       tokenId:
 *                         nullable: true
 *                         type: string
 *                       hederaTransactionId:
 *                         nullable: true
 *                         type: string
 *                       explorerUrl:
 *                         nullable: true
 *                         type: string
 *                       paymentReference:
 *                         nullable: true
 *                         type: string
 *                       status:
 *                         type: string
 *                         example: "paid"
 *                       metadata:
 *                         type: object
 *                         additionalProperties: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get("/history", requireAuth, async (req, res, next) => {
  try {
    const items = await listPaymentsForUser(req.user.id);

    return res.json({
      items: items.map((payment) => ({
        id: payment.id,
        toAgentId: payment.to_agent_id,
        taskExecutionId: payment.task_execution_id,
        amount: Number(payment.amount),
        amountAtomic: payment.amount_atomic,
        currency: payment.currency,
        tokenId: payment.token_id,
        hederaTransactionId: payment.hedera_transaction_id,
        explorerUrl:
          payment.hedera_transaction_id && payment.payment_reference?.startsWith("http")
            ? payment.payment_reference
            : null,
        paymentReference: payment.payment_reference,
        status: payment.status,
        metadata: payment.metadata,
        createdAt: payment.created_at,
      })),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
