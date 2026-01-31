import{_ as f}from"./detailed_lead.fragment-DkOpsOoq.js";const b=`#import "../fragments/detailed_lead.fragment.graphql"

mutation updateLead(
  $leadId: String!
  $listingId: String
  $first_name: String
  $last_name: String
  $email: String
  $phone: String
  $contacted: Boolean
  $viewed: Boolean
  $move_in_date: Date
  $source: LeadSource
  $questionnaire: LeadQuestionnaireInputType
) {
  updateLead(
    input: {
      leadId: $leadId
      first_name: $first_name
      last_name: $last_name
      email: $email
      phone: $phone
      move_in_date: $move_in_date
      listingId: $listingId
      contacted: $contacted
      viewed: $viewed
      source: $source
      questionnaire: $questionnaire
    }
  ) {
    lead {
      ...DetailedLeadFragment
    }
  }
}
`,s={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"mutation",name:{kind:"Name",value:"updateLead"},variableDefinitions:[{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"leadId"}},type:{kind:"NonNullType",type:{kind:"NamedType",name:{kind:"Name",value:"String"}}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"listingId"}},type:{kind:"NamedType",name:{kind:"Name",value:"String"}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"first_name"}},type:{kind:"NamedType",name:{kind:"Name",value:"String"}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"last_name"}},type:{kind:"NamedType",name:{kind:"Name",value:"String"}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"email"}},type:{kind:"NamedType",name:{kind:"Name",value:"String"}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"phone"}},type:{kind:"NamedType",name:{kind:"Name",value:"String"}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"contacted"}},type:{kind:"NamedType",name:{kind:"Name",value:"Boolean"}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"viewed"}},type:{kind:"NamedType",name:{kind:"Name",value:"Boolean"}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"move_in_date"}},type:{kind:"NamedType",name:{kind:"Name",value:"Date"}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"source"}},type:{kind:"NamedType",name:{kind:"Name",value:"LeadSource"}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"questionnaire"}},type:{kind:"NamedType",name:{kind:"Name",value:"LeadQuestionnaireInputType"}},directives:[]}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"updateLead"},arguments:[{kind:"Argument",name:{kind:"Name",value:"input"},value:{kind:"ObjectValue",fields:[{kind:"ObjectField",name:{kind:"Name",value:"leadId"},value:{kind:"Variable",name:{kind:"Name",value:"leadId"}}},{kind:"ObjectField",name:{kind:"Name",value:"first_name"},value:{kind:"Variable",name:{kind:"Name",value:"first_name"}}},{kind:"ObjectField",name:{kind:"Name",value:"last_name"},value:{kind:"Variable",name:{kind:"Name",value:"last_name"}}},{kind:"ObjectField",name:{kind:"Name",value:"email"},value:{kind:"Variable",name:{kind:"Name",value:"email"}}},{kind:"ObjectField",name:{kind:"Name",value:"phone"},value:{kind:"Variable",name:{kind:"Name",value:"phone"}}},{kind:"ObjectField",name:{kind:"Name",value:"move_in_date"},value:{kind:"Variable",name:{kind:"Name",value:"move_in_date"}}},{kind:"ObjectField",name:{kind:"Name",value:"listingId"},value:{kind:"Variable",name:{kind:"Name",value:"listingId"}}},{kind:"ObjectField",name:{kind:"Name",value:"contacted"},value:{kind:"Variable",name:{kind:"Name",value:"contacted"}}},{kind:"ObjectField",name:{kind:"Name",value:"viewed"},value:{kind:"Variable",name:{kind:"Name",value:"viewed"}}},{kind:"ObjectField",name:{kind:"Name",value:"source"},value:{kind:"Variable",name:{kind:"Name",value:"source"}}},{kind:"ObjectField",name:{kind:"Name",value:"questionnaire"},value:{kind:"Variable",name:{kind:"Name",value:"questionnaire"}}}]}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"lead"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"FragmentSpread",name:{kind:"Name",value:"DetailedLeadFragment"},directives:[]}]}}]}}]}}],loc:{start:0,end:747,source:{name:"GraphQL request",locationOffset:{line:1,column:1},body:b}}},N=d=>{const l={};return d.filter(function(n){if(n.kind!=="FragmentDefinition")return!0;const r=n.name.value;return l[r]?!1:(l[r]=!0,!0)})};s.definitions=N(s.definitions.concat(f.definitions));const p=(d,l)=>{const n=(e,i)=>{if(e.kind==="FragmentSpread")i.add(e.name.value);else if(e.kind==="VariableDefinition"){const a=e.type;a.kind==="NamedType"&&i.add(a.name.value)}return e&&"selectionSet"in e&&e.selectionSet&&e.selectionSet.selections.forEach(a=>{n(a,i)}),e&&"variableDefinitions"in e&&e.variableDefinitions&&e.variableDefinitions.forEach(a=>{n(a,i)}),e&&"definitions"in e&&e.definitions&&e.definitions.forEach(a=>{n(a,i)}),i},r=e=>{const i={};return e.definitions.forEach(function(a){"name"in a&&a.name&&(i[a.name.value]=n(a,new Set))}),i},u=(e,i)=>{for(let a=0;a<e.definitions.length;a++){const t=e.definitions[a];if(t&&"name"in t&&t.name&&t.name.value==i)return t}},k=r(d),v=Object.assign({},d,{definitions:[u(d,l)]}),c=k[l]||new Set,o=new Set;let m=new Set;for(c.forEach(e=>{m.add(e)});m.size>0;){const e=m;m=new Set,e.forEach(i=>{o.has(i)||(o.add(i),(k[i]||new Set).forEach(t=>{m.add(t)}))})}return o.forEach(e=>{const i=u(d,e);i&&v.definitions.push(i)}),v};p(s,"updateLead");export{s as _};
//# sourceMappingURL=updateLeadRequest-CRgXdzDs.js.map
