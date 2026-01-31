import{D as v}from"./TownhouseColor--VjQBVqd.js";const p=`#import "../fragments/basicProfile.fragment.graphql"

mutation updateRenterProfile(
  $id: String
  $email: String
  $first_name: String
  $middle_name: String
  $last_name: String
  $telephone: String
  $telephone_type: String
  $profile_pic: String
  $emergency_contact: [EmergencyContactInput]
  $leaseInformation: LeaseInfoInput
) {
  updateRenterProfile(
    input: {
      id: $id
      email: $email
      first_name: $first_name
      middle_name: $middle_name
      last_name: $last_name
      telephone: $telephone
      telephone_type: $telephone_type
      profile_pic: $profile_pic
      emergency_contact: $emergency_contact
      leaseInformation: $leaseInformation
    }
  ) {
    basicProfile {
      ...BasicProfileFragment
    }
  }
}
`,c={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"mutation",name:{kind:"Name",value:"updateRenterProfile"},variableDefinitions:[{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"id"}},type:{kind:"NamedType",name:{kind:"Name",value:"String"}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"email"}},type:{kind:"NamedType",name:{kind:"Name",value:"String"}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"first_name"}},type:{kind:"NamedType",name:{kind:"Name",value:"String"}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"middle_name"}},type:{kind:"NamedType",name:{kind:"Name",value:"String"}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"last_name"}},type:{kind:"NamedType",name:{kind:"Name",value:"String"}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"telephone"}},type:{kind:"NamedType",name:{kind:"Name",value:"String"}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"telephone_type"}},type:{kind:"NamedType",name:{kind:"Name",value:"String"}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"profile_pic"}},type:{kind:"NamedType",name:{kind:"Name",value:"String"}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"emergency_contact"}},type:{kind:"ListType",type:{kind:"NamedType",name:{kind:"Name",value:"EmergencyContactInput"}}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"leaseInformation"}},type:{kind:"NamedType",name:{kind:"Name",value:"LeaseInfoInput"}},directives:[]}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"updateRenterProfile"},arguments:[{kind:"Argument",name:{kind:"Name",value:"input"},value:{kind:"ObjectValue",fields:[{kind:"ObjectField",name:{kind:"Name",value:"id"},value:{kind:"Variable",name:{kind:"Name",value:"id"}}},{kind:"ObjectField",name:{kind:"Name",value:"email"},value:{kind:"Variable",name:{kind:"Name",value:"email"}}},{kind:"ObjectField",name:{kind:"Name",value:"first_name"},value:{kind:"Variable",name:{kind:"Name",value:"first_name"}}},{kind:"ObjectField",name:{kind:"Name",value:"middle_name"},value:{kind:"Variable",name:{kind:"Name",value:"middle_name"}}},{kind:"ObjectField",name:{kind:"Name",value:"last_name"},value:{kind:"Variable",name:{kind:"Name",value:"last_name"}}},{kind:"ObjectField",name:{kind:"Name",value:"telephone"},value:{kind:"Variable",name:{kind:"Name",value:"telephone"}}},{kind:"ObjectField",name:{kind:"Name",value:"telephone_type"},value:{kind:"Variable",name:{kind:"Name",value:"telephone_type"}}},{kind:"ObjectField",name:{kind:"Name",value:"profile_pic"},value:{kind:"Variable",name:{kind:"Name",value:"profile_pic"}}},{kind:"ObjectField",name:{kind:"Name",value:"emergency_contact"},value:{kind:"Variable",name:{kind:"Name",value:"emergency_contact"}}},{kind:"ObjectField",name:{kind:"Name",value:"leaseInformation"},value:{kind:"Variable",name:{kind:"Name",value:"leaseInformation"}}}]}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"basicProfile"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"FragmentSpread",name:{kind:"Name",value:"BasicProfileFragment"},directives:[]}]}}]}}]}}],loc:{start:0,end:792,source:{name:"GraphQL request",locationOffset:{line:1,column:1},body:p}}},b=l=>{const d={};return l.filter(function(a){if(a.kind!=="FragmentDefinition")return!0;const m=a.name.value;return d[m]?!1:(d[m]=!0,!0)})};c.definitions=b(c.definitions.concat(v.definitions));const N=(l,d)=>{const a=(e,i)=>{if(e.kind==="FragmentSpread")i.add(e.name.value);else if(e.kind==="VariableDefinition"){const n=e.type;n.kind==="NamedType"&&i.add(n.name.value)}return e&&"selectionSet"in e&&e.selectionSet&&e.selectionSet.selections.forEach(n=>{a(n,i)}),e&&"variableDefinitions"in e&&e.variableDefinitions&&e.variableDefinitions.forEach(n=>{a(n,i)}),e&&"definitions"in e&&e.definitions&&e.definitions.forEach(n=>{a(n,i)}),i},m=e=>{const i={};return e.definitions.forEach(function(n){"name"in n&&n.name&&(i[n.name.value]=a(n,new Set))}),i},s=(e,i)=>{for(let n=0;n<e.definitions.length;n++){const t=e.definitions[n];if(t&&"name"in t&&t.name&&t.name.value==i)return t}},k=m(l),u=Object.assign({},l,{definitions:[s(l,d)]}),f=k[d]||new Set,o=new Set;let r=new Set;for(f.forEach(e=>{r.add(e)});r.size>0;){const e=r;r=new Set,e.forEach(i=>{o.has(i)||(o.add(i),(k[i]||new Set).forEach(t=>{r.add(t)}))})}return o.forEach(e=>{const i=s(l,e);i&&u.definitions.push(i)}),u};N(c,"updateRenterProfile");export{c as _};
//# sourceMappingURL=updateRenterProfile-D1CFbOA8.js.map
