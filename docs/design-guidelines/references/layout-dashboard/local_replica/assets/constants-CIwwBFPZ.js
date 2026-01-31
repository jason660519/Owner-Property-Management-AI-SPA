import{j as i,al as o,a3 as r,a9 as c,B as m,P as n}from"./TownhouseColor--VjQBVqd.js";import{d$ as u}from"./main-dumNSXg9.js";const k=`query listingSetupChecklistStatus($id: String!) {
  listing_setup_checklist_status(id: $id) {
    id
    completedPercentage
    completedCount
    status
    steps {
      publish
      improve
      showing
      inviteToShowing
      invite
      lease
    }
  }
}
`,C={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"listingSetupChecklistStatus"},variableDefinitions:[{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"id"}},type:{kind:"NonNullType",type:{kind:"NamedType",name:{kind:"Name",value:"String"}}},directives:[]}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"listing_setup_checklist_status"},arguments:[{kind:"Argument",name:{kind:"Name",value:"id"},value:{kind:"Variable",name:{kind:"Name",value:"id"}}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"completedPercentage"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"completedCount"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"status"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"steps"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"publish"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"improve"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"showing"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"inviteToShowing"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"invite"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"lease"},arguments:[],directives:[]}]}}]}}]}}],loc:{start:0,end:306,source:{name:"GraphQL request",locationOffset:{line:1,column:1},body:k}}},p="oqiKk",v="WHa3M",S="_9BK-K",g="RwZKR",t={container:p,icon:v,title:S,description:g},E=({user:e,title:l="This rental is on Autopilot",description:d,buttonText:s})=>i.jsxs(o,{padded:!0,className:t.container,children:[i.jsx(r,{className:t.icon,name:"lighting",size:"xl",color:"#B793F5"}),i.jsx("h2",{className:t.title,children:l}),i.jsx(c,{className:t.description,children:d}),s&&i.jsx(m,{variant:"outline",width:232,href:u(e?.email),target:"_blank",rel:"noopener noreferrer",className:t.questionButton,children:s})]});E.propTypes={user:n.object.isRequired,title:n.string,description:n.string,buttonText:n.string};const T={COMPLETED:"COMPLETED",ACTIVE:"ACTIVE"},a={IN_PROGRESS:"IN_PROGRESS",COMPLETED:"COMPLETED"},N="lease_setup_checklist_",P=e=>`${N}${e}`,F=e=>e===T.COMPLETED,y=e=>e===a.COMPLETED,O=e=>e===a.IN_PROGRESS;export{T as S,E as T,C as _,y as a,O as b,P as g,F as i};
//# sourceMappingURL=constants-CIwwBFPZ.js.map
