export const ROLES = Object.freeze({
  HOST: 'host',
  MODERATOR: 'moderator',
  PARTICIPANT: 'participant',
  VIEWER: 'viewer'
});

export const ASSIGNABLE_ROLES = [ROLES.MODERATOR, ROLES.PARTICIPANT, ROLES.VIEWER];

export const CONTROL_ACTIONS = ['play', 'pause', 'seek', 'change_video'];

const CHAT = ['chat', 'react'];
const REQUEST = ['request_change'];

const matrix = {
  [ROLES.HOST]: new Set([
    ...CONTROL_ACTIONS,
    ...CHAT,
    'review_request',
    'assign_role',
    'remove_participant',
    'transfer_host'
  ]),
  [ROLES.MODERATOR]: new Set([...CONTROL_ACTIONS, ...CHAT, 'review_request']),
  [ROLES.PARTICIPANT]: new Set([...CHAT, ...REQUEST]),
  [ROLES.VIEWER]: new Set([...CHAT, ...REQUEST])
};

export function can(role, action) {
  const allowed = matrix[role];
  return allowed ? allowed.has(action) : false;
}
