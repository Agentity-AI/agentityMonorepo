const express = require("express");
const router = express.Router();

const { requireAuth } = require("../middleware/auth");
const Agent = require("../models/agent");
const AgentWallet = require("../models/agentWallet");
const SimulationRun = require("../models/simulationRun");
const PaymentRecord = require("../models/paymentRecord");
const TaskExecution = require("../models/taskExecution");
const Alert = require("../models/alert");

/**
 * @openapi
 * tags:
 *   - name: Workflow
 *     description: Product-flow summary endpoints for dashboard onboarding and progress tracking
 */

/**
 * @openapi
 * /workflow/summary:
 *   get:
 *     tags: [Workflow]
 *     summary: Get the authenticated user's backend workflow progress summary
 *     description: |
 *       Returns a high-level progress snapshot the frontend can use to drive onboarding,
 *       product walkthroughs, or setup checklists.
 *
 *       The response includes:
 *       - aggregate counts for major backend resources
 *       - step-by-step completion flags for the expected product workflow
 *       - the next API endpoints the frontend can call to advance the user
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Workflow summary and completion checklist
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalAgents:
 *                       type: integer
 *                       example: 3
 *                     verifiedAgents:
 *                       type: integer
 *                       example: 2
 *                     linkedWallets:
 *                       type: integer
 *                       example: 1
 *                     simulations:
 *                       type: integer
 *                       example: 5
 *                     paidTransactions:
 *                       type: integer
 *                       example: 2
 *                     completedTasks:
 *                       type: integer
 *                       example: 2
 *                     activeAlerts:
 *                       type: integer
 *                       example: 1
 *                 steps:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       key:
 *                         type: string
 *                         example: "register-agent"
 *                       completed:
 *                         type: boolean
 *                         example: true
 *                       endpoint:
 *                         type: string
 *                         example: "POST /agents/register"
 *       401:
 *         description: Missing or invalid authentication token
 *       500:
 *         description: Failed to build workflow summary
 */
router.get("/summary", requireAuth, async (req, res, next) => {
  try {
    const [
      totalAgents,
      verifiedAgents,
      linkedWallets,
      simulations,
      payments,
      tasks,
      alerts,
    ] = await Promise.all([
      Agent.count({ where: { creator_id: req.user.id } }),
      Agent.count({ where: { creator_id: req.user.id, status: "verified" } }),
      AgentWallet.count({
        include: [
          {
            model: Agent,
            as: "agent",
            attributes: [],
            required: true,
            where: { creator_id: req.user.id },
          },
        ],
        where: { status: "linked" },
      }),
      SimulationRun.count({ where: { user_id: req.user.id } }),
      PaymentRecord.count({ where: { from_user_id: req.user.id, status: "paid" } }),
      TaskExecution.count({ where: { requester_user_id: req.user.id, status: "completed" } }),
      Alert.count({ where: { user_id: req.user.id, status: "active" } }),
    ]);

    return res.json({
      summary: {
        totalAgents,
        verifiedAgents,
        linkedWallets,
        simulations,
        paidTransactions: payments,
        completedTasks: tasks,
        activeAlerts: alerts,
      },
      steps: [
        {
          key: "register-agent",
          completed: totalAgents > 0,
          endpoint: "POST /agents/register",
        },
        {
          key: "verify-agent",
          completed: verifiedAgents > 0,
          endpoint: "POST /agents/:id/verify",
        },
        {
          key: "link-wallet",
          completed: linkedWallets > 0,
          endpoint: "POST /wallets/link",
        },
        {
          key: "simulate",
          completed: simulations > 0,
          endpoint: "POST /simulation/run",
        },
        {
          key: "pay",
          completed: payments > 0,
          endpoint: "POST /tasks/:id/pay",
        },
        {
          key: "execute",
          completed: tasks > 0,
          endpoint: "POST /tasks/:id/execute",
        },
      ],
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
