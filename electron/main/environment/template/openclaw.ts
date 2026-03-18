export default {
  models: {
    mode: 'merge',
    providers: {
      zai: {
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4/',
        apiKey: '',
        models: [
          {
            id: 'glm-4.7',
            name: 'GLM-4.7',
            reasoning: true,
            input: ['text'],
            cost: {
              input: 0,
              output: 0,
              cacheRead: 0,
              cacheWrite: 0
            },
            contextWindow: 200000,
            maxTokens: 131072
          }
        ]
      }
    }
  },
  agents: {
    defaults: {
      model: {
        primary: 'zai/glm-4.7'
      },
      maxConcurrent: 4,
      subagents: {
        maxConcurrent: 8
      }
    }
  },
  commands: {
    native: 'auto',
    nativeSkills: 'auto',
    restart: true,
    ownerDisplay: 'raw'
  }
}
