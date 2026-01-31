import{r as N,u as _,v as p,j as i,L as S,P as d}from"./TownhouseColor--VjQBVqd.js";import{_ as F,a as y,C as h}from"./CancelShowing-plllpxlS.js";import{cR as f,aP as w}from"./main-dumNSXg9.js";const b=`query scheduledShowing($id: ID!) {
  node(id: $id) {
    id
    __typename
    ... on ScheduledShowing {
      id
      start_at
      end_at
      canceled_at
      listing {
        id
        city
        state
        nickname
        room_name
        unit
        address
        zip
        zip_tz
      }
      owner {
        id
        first_name
        last_name
        company
      }
      renters {
        id
        first_name
        last_name
        attending_at
      }
    }
  }
}
`,s={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"scheduledShowing"},variableDefinitions:[{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"id"}},type:{kind:"NonNullType",type:{kind:"NamedType",name:{kind:"Name",value:"ID"}}},directives:[]}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"node"},arguments:[{kind:"Argument",name:{kind:"Name",value:"id"},value:{kind:"Variable",name:{kind:"Name",value:"id"}}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"__typename"},arguments:[],directives:[]},{kind:"InlineFragment",typeCondition:{kind:"NamedType",name:{kind:"Name",value:"ScheduledShowing"}},directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"start_at"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"end_at"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"canceled_at"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"listing"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"city"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"state"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"nickname"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"room_name"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"unit"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"address"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"zip"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"zip_tz"},arguments:[],directives:[]}]}},{kind:"Field",name:{kind:"Name",value:"owner"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"first_name"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"last_name"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"company"},arguments:[],directives:[]}]}},{kind:"Field",name:{kind:"Name",value:"renters"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"first_name"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"last_name"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"attending_at"},arguments:[],directives:[]}]}}]}}]}}]}}],loc:{start:0,end:542,source:{name:"GraphQL request",locationOffset:{line:1,column:1},body:b}}},C="yecDW",q="_2IDCN",l={container:C,closeIcon:q},D=({open:n,onClose:a,showingId:e})=>{const[m,r]=N.useState(!1),{data:c,loading:o}=_(s,{variables:{id:e},skip:!e||!n}),t=c?.node||{},[u,{loading:k}]=p(F,{variables:{showingId:e},refetchQueries:[{query:s,variables:{id:e}},{query:f}],skip:!e||!n}),v=async()=>{await u(),r(!0)},g=`We emailed ${t.renters?.[0]?.first_name} ${t.renters?.[0]?.last_name} to let them know that you’ve canceled this showing.`;return i.jsx(w,{open:n,onClose:a,className:l.container,showCloseIcon:!0,closeIconClassName:l.closeIcon,children:i.jsx(S,{loading:o,children:m?i.jsx(y,{action:a,description:g}):i.jsx(h,{showing:t,onCancelShowing:v,userLooking:"owner",onClose:a,loading:k})})})};D.propTypes={showingId:d.string,onClose:d.func,open:d.bool};export{D as C,s as _};
//# sourceMappingURL=CancelShowingWrappedOwner-D9HfHHo4.js.map
