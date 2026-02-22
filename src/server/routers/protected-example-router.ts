import { protectedProcedure, roleProcedure, permissionProcedure, router } from '../trpc';

export const protectedExampleRouter = router({
  getSecret: protectedProcedure.query(({ ctx }) => {
    return {
      message: `Hello, ${ctx.user.name}! This is a protected message.`,
      user: ctx.user,
    };
  }),
  adminOnly: roleProcedure(['admin']).query(({ ctx }) => {
    return {
      message: `Hello, admin ${ctx.user.name}!`,
    };
  }),
  manageAgents: permissionProcedure(['manage_agents']).query(({ ctx }) => {
    return {
      message: `You have permission to manage agents, ${ctx.user.name}.`,
    };
  }),
});
