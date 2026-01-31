import{h as s,u as d}from"./TownhouseColor--VjQBVqd.js";const l=`# Basic leases query for simple dropdowns with renter information
# Only fetches essential fields: id, title, status, listing_id, and renter information
query LeasesWithRentersQuery($includePast: Boolean) {
  userData {
    id
    leases(includePast: $includePast) {
      dataHash
      data {
        id
        title
        status
        listing_id
        renters {
          id
          first_name
          last_name
          email
          telephone
          invited_at
        }
      }
    }
  }
}
`,r={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"LeasesWithRentersQuery"},variableDefinitions:[{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"includePast"}},type:{kind:"NamedType",name:{kind:"Name",value:"Boolean"}},directives:[]}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"userData"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"leases"},arguments:[{kind:"Argument",name:{kind:"Name",value:"includePast"},value:{kind:"Variable",name:{kind:"Name",value:"includePast"}}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"dataHash"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"data"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"title"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"status"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"listing_id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"renters"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"first_name"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"last_name"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"email"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"telephone"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"invited_at"},arguments:[],directives:[]}]}}]}}]}}]}}]}}],loc:{start:0,end:551,source:{name:"GraphQL request",locationOffset:{line:1,column:1},body:l}}},u=(n={},e)=>{const{USER_PROFILE_POLL_INTERVAL:a}=s();e===void 0&&(e=a);const t=e&&e>0?{pollInterval:e}:{},i=d(r,{...t,...n,context:{...e&&e>0?{pollingEnabled:!0}:{},...n.context||{}}});return{response:i,loading:i.loading&&i.networkStatus!==6,leases:i?.data?.userData?.leases?.data??[],refetch:i.refetch}};export{u};
//# sourceMappingURL=useLeasesWithRenters-BVXQPTBU.js.map
