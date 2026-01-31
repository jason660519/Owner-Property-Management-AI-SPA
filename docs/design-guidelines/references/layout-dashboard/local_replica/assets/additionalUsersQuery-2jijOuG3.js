const e=`query additionalUsersQuery {
  userData {
    id
    settingsAndBilling {
      dataHash
      data {
        ... on OwnerSettings {
          id
          additionalUsers {
            id
            first_name
            last_name
            telephone
            email
            confirmed_at
            invited_at
            user_role
            allowed_listing_ids
            permissions_config
            __typename
          }
        }
      }
    }
  }
}
`,i={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"additionalUsersQuery"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"userData"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"settingsAndBilling"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"dataHash"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"data"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"InlineFragment",typeCondition:{kind:"NamedType",name:{kind:"Name",value:"OwnerSettings"}},directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"additionalUsers"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"first_name"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"last_name"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"telephone"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"email"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"confirmed_at"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"invited_at"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"user_role"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"allowed_listing_ids"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"permissions_config"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"__typename"},arguments:[],directives:[]}]}}]}}]}}]}}]}}]}}],loc:{start:0,end:510,source:{name:"GraphQL request",locationOffset:{line:1,column:1},body:e}}};export{i as _};
//# sourceMappingURL=additionalUsersQuery-2jijOuG3.js.map
