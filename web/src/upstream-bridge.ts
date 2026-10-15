/** 喵喵评分运行时需要的只读元数据注册表。 */
const metadata: Record<string,Record<string,unknown>> = {}
/** 注册game游戏的data词条元数据，避免加载机器人和文件系统。 */
export function registerMetadata(game:string,data:Record<string,unknown>):void { metadata[game]=data }
/** 保留评分函数原有的Meta.getMeta调用接口。 */
export const Meta = { getMeta(game:string,_name:string,key?:string):any { return key ? metadata[game]?.[key] : metadata[game] } }
/** 格式化num，decimals为保留小数位。 */
function number(num:unknown,decimals=1):string { return Number(num||0).toLocaleString('zh-CN',{minimumFractionDigits:0,maximumFractionDigits:decimals}) }
/** 评分涉及的元素属性，统一喵喵两种游戏的名称。 */
const elements:Record<string,string>={pyro:'火',hydro:'水',cryo:'冰',electro:'雷',anemo:'风',geo:'岩',dendro:'草',fire:'火',ice:'冰',elec:'雷',wind:'风',quantum:'量子',imaginary:'虚数',phy:'物理'}
/** 同源评分代码所需的格式化接口。 */
export const Format = { comma:number,pct:(value:unknown,decimals=1)=>number(value,decimals)+'%',isElem:(key:string)=>key in elements,sameElem:(a:string,b:string)=>elements[a]===elements[b]&&a in elements,eachElem:(fn:(key:string,name:string)=>void)=>Object.entries(elements).forEach(([key,name])=>fn(key,name)) }
/** 同源评分结果只需要从对象中取已声明字段。 */
export const Data = { getData(data:Record<string,unknown>,keys:string):Record<string,unknown> { return Object.fromEntries(keys.split(',').map(key=>[key,data[key]])) } }
