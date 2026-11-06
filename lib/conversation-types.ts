import type {PlaceId} from './world';
export type TopicIcon='idea'|'difference'|'boundary'|'change'|'question'|'care';
export type SceneReference={dreamId:string;eventId:string;title:string;place:PlaceId;mode:'realtime'|'accelerated';source:'person'|'em'|'projection';quote:string;sceneTime:number;actors:{name:string;avatar:number}[]};
export type Highlight={eventId:string;icon:TopicIcon;title:string};
export type TopicSuggestion={id:string;icon:TopicIcon;text:string;eventId?:string};
export type EMControl={id:string;owner:string;role:'user'|'em';text:string;time:number;topics?:TopicSuggestion[]};
export type AutoPending={id:string;actor:string;trigger:string;createdAt:number;keyVersion:number};
export type AutoJob={worldId:string;selfId:string;peerId:string;trigger:string;userId:string;pendingId:string};
