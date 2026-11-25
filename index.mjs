import {
  bearer,
  connection,
  error,
  includesAll,
  resourceCheck,
  segment,
  target,
  text,
  verdict,
  z,
} from '@cairul/plugin-kit';

export default function asana(options) {
  const api = connection(options, {
    prefix: 'ASANA',
    baseUrl: 'https://app.asana.com/api/1.0',
    tokenEnv: 'ASANA_TOKEN',
    required: true,
    authModes: { bearer },
  });
  const task = (query, shape, evaluate) =>
    resourceCheck({
      api,
      identifier: 'task',
      parseURL: (url) => target(undefined, url, [api.host], /\/(?:0\/[^/]+\/|task\/)(\d+)(?:\/|$)/),
      path: (id) => `tasks/${segment(id)}`,
      query: { opt_fields: query },
      shape,
      evaluate: ({ data }, inputs) => (data ? evaluate(data, inputs) : error('Asana returned no task.')),
    });
  return {
    checkKinds: {
      'asana.task-complete': task('completed', {}, ({ completed }) =>
        typeof completed === 'boolean'
          ? verdict(completed, completed ? 'Task complete.' : 'Waiting for task completion.')
          : error('Asana returned no completion status.')
      ),
      'asana.task-tags': task('tags.name', { tags: z.array(text).min(1) }, ({ tags }, inputs) =>
        includesAll(
          tags?.map(({ name }) => name),
          inputs.tags,
          'task tags'
        )
      ),
      'asana.approval-accepted': task('approval_status', {}, ({ approval_status: status }) =>
        verdict(status === 'approved', `Approval status: ${status ?? 'unavailable'}.`)
      ),
    },
  };
}
