/** 静态适配只调用不依赖Artifact模型的评分路径，完整模型方法明确不可用。 */
export const Artifact = { get():never { throw new Error('静态评分不加载机器人Artifact模型') } }
