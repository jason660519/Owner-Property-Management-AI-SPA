import{v as l,au as u}from"./TownhouseColor--VjQBVqd.js";import{d0 as k}from"./main-dumNSXg9.js";const h=`mutation archiveChat(
  $renterId: String!
  $chatOwnerId: String!
  $tags: [String!]
) {
  archiveChat(
    input: { renterId: $renterId, chatOwnerId: $chatOwnerId, tags: $tags }
  ) {
    ok
    message
  }
}
`,g={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"mutation",name:{kind:"Name",value:"archiveChat"},variableDefinitions:[{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"renterId"}},type:{kind:"NonNullType",type:{kind:"NamedType",name:{kind:"Name",value:"String"}}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"chatOwnerId"}},type:{kind:"NonNullType",type:{kind:"NamedType",name:{kind:"Name",value:"String"}}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"tags"}},type:{kind:"ListType",type:{kind:"NonNullType",type:{kind:"NamedType",name:{kind:"Name",value:"String"}}}},directives:[]}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"archiveChat"},arguments:[{kind:"Argument",name:{kind:"Name",value:"input"},value:{kind:"ObjectValue",fields:[{kind:"ObjectField",name:{kind:"Name",value:"renterId"},value:{kind:"Variable",name:{kind:"Name",value:"renterId"}}},{kind:"ObjectField",name:{kind:"Name",value:"chatOwnerId"},value:{kind:"Variable",name:{kind:"Name",value:"chatOwnerId"}}},{kind:"ObjectField",name:{kind:"Name",value:"tags"},value:{kind:"Variable",name:{kind:"Name",value:"tags"}}}]}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"ok"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"message"},arguments:[],directives:[]}]}}]}}],loc:{start:0,end:249,source:{name:"GraphQL request",locationOffset:{line:1,column:1},body:h}}},p=`mutation archiveGroupChat(
  $guid: String!
  $chatOwnerId: String!
  $tags: [String!]
) {
  archiveGroupChat(
    input: { guid: $guid, chatOwnerId: $chatOwnerId, tags: $tags }
  ) {
    ok
    message
  }
}
`,N={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"mutation",name:{kind:"Name",value:"archiveGroupChat"},variableDefinitions:[{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"guid"}},type:{kind:"NonNullType",type:{kind:"NamedType",name:{kind:"Name",value:"String"}}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"chatOwnerId"}},type:{kind:"NonNullType",type:{kind:"NamedType",name:{kind:"Name",value:"String"}}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"tags"}},type:{kind:"ListType",type:{kind:"NonNullType",type:{kind:"NamedType",name:{kind:"Name",value:"String"}}}},directives:[]}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"archiveGroupChat"},arguments:[{kind:"Argument",name:{kind:"Name",value:"input"},value:{kind:"ObjectValue",fields:[{kind:"ObjectField",name:{kind:"Name",value:"guid"},value:{kind:"Variable",name:{kind:"Name",value:"guid"}}},{kind:"ObjectField",name:{kind:"Name",value:"chatOwnerId"},value:{kind:"Variable",name:{kind:"Name",value:"chatOwnerId"}}},{kind:"ObjectField",name:{kind:"Name",value:"tags"},value:{kind:"Variable",name:{kind:"Name",value:"tags"}}}]}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"ok"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"message"},arguments:[],directives:[]}]}}]}}],loc:{start:0,end:247,source:{name:"GraphQL request",locationOffset:{line:1,column:1},body:p}}},w=()=>{const[t,{loading:v}]=l(g),[r,{loading:m}]=l(N),d=k(),o=n=>{if(!n)return{};const e=n.split("_");if(e[0]==="group")return{};const a=`${e[0]}_${e[1]}`,i=`${e[3]}_${e[4]}`;return{ownerId:a,renterId:i}};return{handleChatArchiving:async(n,e)=>{const{ownerId:a,renterId:i}=o(n);if(!a||!i)return;(await t({variables:{renterId:i,chatOwnerId:a,tags:["archive_conversation"]}}))?.data?.archiveChat?.ok&&e&&(e(),d("Chat archived"))},handleGroupChatArchiving:async(n,e,a)=>{try{(await r({variables:{guid:n,chatOwnerId:e,tags:["archive_conversation"]}}))?.data?.archiveGroupChat?.ok&&(a?.(),d("Group chat removed successfully"))}catch(i){console.error("Failed to archive group chat:",i)}},archiveInProgress:v||m,unarchiveChat:async n=>{const{ownerId:e,renterId:a}=o(n);if(!(!e||!a))try{const c=(await u.CometChat.getLoggedinUser())?.getRole()!=="renter",s=await u.CometChat.getConversation(c?a:e,"user");if(!s?.tags||!s?.tags?.includes("archive_conversation"))return;await t({variables:{renterId:a,chatOwnerId:e,tags:[]}})}catch(i){console.error("Failed to unarchive chat:",i)}},unarchiveGroupChat:async(n,e)=>{if(!n||!e){console.error("GUID and chatOwnerId are required to unarchive a group chat.");return}try{await r({variables:{guid:n,chatOwnerId:e,tags:[]}})}catch(a){console.error("Failed to unarchive group chat:",a)}}}};export{w as u};
//# sourceMappingURL=useChatArchive-Cd6Myl8B.js.map
