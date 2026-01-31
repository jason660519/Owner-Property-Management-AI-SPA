import{n as k}from"./TownhouseColor--VjQBVqd.js";const g=`#import "./lead.fragment.graphql"

fragment DetailedLeadFragment on Lead {
  ...LeadFragment
  renter {
    id
    first_name
    last_name
    email
    telephone
    profile_pic
    renter_notes {
      user
      action
      status
      note
      date
      listingId
    }
    has_password
    profile_colors
    created_at
    deleted_at
    deleted_by
  }
}
`,c={kind:"Document",definitions:[{kind:"FragmentDefinition",name:{kind:"Name",value:"DetailedLeadFragment"},typeCondition:{kind:"NamedType",name:{kind:"Name",value:"Lead"}},directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"FragmentSpread",name:{kind:"Name",value:"LeadFragment"},directives:[]},{kind:"Field",name:{kind:"Name",value:"renter"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"first_name"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"last_name"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"email"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"telephone"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"profile_pic"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"renter_notes"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"user"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"action"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"status"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"note"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"date"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"listingId"},arguments:[],directives:[]}]}},{kind:"Field",name:{kind:"Name",value:"has_password"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"profile_colors"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"created_at"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"deleted_at"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"deleted_by"},arguments:[],directives:[]}]}}]}}],loc:{start:0,end:405,source:{name:"GraphQL request",locationOffset:{line:1,column:1},body:g}}},F=d=>{const s={};return d.filter(function(t){if(t.kind!=="FragmentDefinition")return!0;const l=t.name.value;return s[l]?!1:(s[l]=!0,!0)})};c.definitions=F(c.definitions.concat(k.definitions));const p=(d,s)=>{const t=(e,i)=>{if(e.kind==="FragmentSpread")i.add(e.name.value);else if(e.kind==="VariableDefinition"){const n=e.type;n.kind==="NamedType"&&i.add(n.name.value)}return e&&"selectionSet"in e&&e.selectionSet&&e.selectionSet.selections.forEach(n=>{t(n,i)}),e&&"variableDefinitions"in e&&e.variableDefinitions&&e.variableDefinitions.forEach(n=>{t(n,i)}),e&&"definitions"in e&&e.definitions&&e.definitions.forEach(n=>{t(n,i)}),i},l=e=>{const i={};return e.definitions.forEach(function(n){"name"in n&&n.name&&(i[n.name.value]=t(n,new Set))}),i},o=(e,i)=>{for(let n=0;n<e.definitions.length;n++){const a=e.definitions[n];if(a&&"name"in a&&a.name&&a.name.value==i)return a}},u=l(d),f=Object.assign({},d,{definitions:[o(d,s)]}),v=u[s]||new Set,m=new Set;let r=new Set;for(v.forEach(e=>{r.add(e)});r.size>0;){const e=r;r=new Set,e.forEach(i=>{m.has(i)||(m.add(i),(u[i]||new Set).forEach(a=>{r.add(a)}))})}return m.forEach(e=>{const i=o(d,e);i&&f.definitions.push(i)}),f};p(c,"DetailedLeadFragment");export{c as _};
//# sourceMappingURL=detailed_lead.fragment-DkOpsOoq.js.map
