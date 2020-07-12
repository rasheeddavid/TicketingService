import { Resolver, Context } from "../Utils/graphql-utile";
import { logged_in_helper } from "../../Utils/helper/loggedin_helper";
import { Ticket } from "../../Database/entities/Tickets";
import { ObjectID } from "typeorm";

/**
 * @default         middleware function
 * @description     Middleware to check if valid session & user is attched to request
 * @param resolver  type Resolver
 * @param parent    any
 * @param args      Mutation or Query Arguments
 * @param context   interface Context, define context of graphql context
 * @param info      any
 */

export default async (
  resolver: Resolver,
  parent: any,
  args: any,
  context: Context,
  info: any
) => {
  const { session } = context;

  if (await logged_in_helper(session)) {
    if (session.user.role == 2)
      return await resolver(
        parent,
        args,
        {
          ...context,
          middleware_result: {
            ok: true,
            message: "valid customer - found",
            status: 200,
            error: null,
          },
        },
        info
      );
  }

  return await resolver(
    parent,
    args,
    {
      ...context,
      middleware_result: {
        ok: false,
        message: "protected route",
        status: 401,
        error: [
          {
            path: "login",
            message: "no user detected, re-authenticate",
          },
        ],
      },
    },
    info
  );
};

export const logged_in_admin = async (
  resolver: Resolver,
  parent: any,
  args: any,
  context: Context,
  info: any
) => {
  const { session } = context;

  if (await logged_in_helper(session)) {
    if (session.user.role == 1)
      return await resolver(
        parent,
        args,
        {
          ...context,
          middleware_result: {
            ok: true,
            message: "valid admin found",
            status: 200,
            error: null,
          },
        },
        info
      );
  }

  return await resolver(
    parent,
    args,
    {
      ...context,
      middleware_result: {
        ok: false,
        message: "protected route",
        status: 401,
        error: [
          {
            path: "login",
            message: "no admin user detected, authenticate and try again",
          },
        ],
      },
    },
    info
  );
};

export const LoadCommentsMiddleWare = async (
  resolver: Resolver,
  parent: any,
  args: GQL.ILoadTCommentHistoryOnQueryArguments,
  context: Context,
  info: any
) => {
  const { session } = context;
  const ticketIdObjectId = new ObjectID(args.ticketId);

  // find Ticket
  const ticket = await Ticket.repo().findOne({ id: ticketIdObjectId });

  if (ticket) {
    if (await logged_in_helper(session)) {
      if (session.user.role == 1) {
        // if user ->> admin continue
        return await resolver(
          parent,
          args,
          {
            ...context,
            middleware_result: {
              ok: true,
              message: "valid admin found",
              status: 200,
              error: null,
            },
          },
          info
        );
      } else {
        // session.user.role == 2
        // user ->> customer , ticket.owner == ObjectID(session.user_id)
        if (new ObjectID(session.user_id) == ticket.owner.id) {
          // user owns ticket
          return await resolver(
            parent,
            args,
            {
              ...context,
              middleware_result: {
                ok: true,
                message: "valid customer-user found",
                status: 200,
                error: null,
              },
            },
            info
          );
        } else {
          // user doesn't own ticket
          return await resolver(
            parent,
            args,
            {
              ...context,
              middleware_result: {
                ok: false,
                message: "protected route",
                status: 401,
                error: [
                  {
                    path: "auth",
                    message: "you dont have access rights to view this ticket",
                  },
                ],
              },
            },
            info
          );
        }
      }
    } else {
      // no valid user found
      return await resolver(
        parent,
        args,
        {
          ...context,
          middleware_result: {
            ok: false,
            message: "protected route",
            status: 401,
            error: [
              {
                path: "login",
                message: "no valid user detected",
              },
            ],
          },
        },
        info
      );
    }
  }

  return await resolver(
    parent,
    args,
    {
      ...context,
      middleware_result: {
        ok: false,
        message: "protected route",
        status: 401,
        error: [
          {
            path: "ticketID",
            message: "invalid ticket ID was used",
          },
        ],
      },
    },
    info
  );
};

/**
 *  ok: boolean,
 *   message: string,
 *   status: number,
 *   error: {path: string, message: string}[]
 *   ]
 */
