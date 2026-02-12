
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function audit() {
    console.log('🔄 Fetching IAM data...');
    
    // 1. Fetch Users
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) throw userError;

    // 2. Fetch Groups
    const { data: groups, error: groupError } = await supabase.from('iam_groups').select('*');
    if (groupError) throw groupError;

    // 3. Fetch Roles
    const { data: roles, error: roleError } = await supabase.from('iam_roles').select('*');
    if (roleError) throw roleError;

    // 4. Fetch Members
    const { data: members, error: memberError } = await supabase.from('iam_group_members').select('*');
    if (memberError) throw memberError;

    // 5. Fetch Group Roles
    const { data: groupRoles, error: groupRoleError } = await supabase.from('iam_group_roles').select('*');
    if (groupRoleError) throw groupRoleError;

    let output = `# IAM Audit Report\n\nGenerated at: ${new Date().toLocaleString()}\n\n`;

    // --- Report 1: Users & Groups ---
    output += '## User & Group Memberships\n';
    output += '| User Email | Display Name | Role (Metadata) | Groups | User ID |\n';
    output += '|---|---|---|---|---|\n';

    for (const user of users) {
        const userGroups = members
            .filter((m: any) => m.user_id === user.id)
            .map((m: any) => {
                const g = groups.find((g: any) => g.id === m.group_id);
                return g ? g.name : m.group_id;
            })
            .join(', ');

        const displayName = user.user_metadata?.display_name || user.user_metadata?.full_name || '-';
        const metaRole = user.user_metadata?.role || '-';

        output += `| ${user.email} | ${displayName} | ${metaRole} | ${userGroups || '(No Group)'} | ${user.id} |\n`;
    }

    output += '\n## Group & Role Assignments\n';
    output += '| Group Name | Assigned Roles | Group ID |\n';
    output += '|---|---|---|\n';

    for (const group of groups) {
        const assignedRoles = groupRoles
            .filter((gr: any) => gr.group_id === group.id)
            .map((gr: any) => {
                const r = roles.find((r: any) => r.id === gr.role_id);
                return r ? r.name : gr.role_id;
            })
            .join(', ');
        
        output += `| ${group.name} | ${assignedRoles || '(No Role)'} | ${group.id} |\n`;
    }
    
    output += '\n## Available Roles (Definition)\n';
    output += '| Role Name | Role ID |\n';
    output += '|---|---|\n';
    for (const role of roles) {
        output += `| ${role.name} | ${role.id} |\n`;
    }

    output += '\n## Raw Counts\n';
    output += `- Users: ${users.length}\n`;
    output += `- Groups: ${groups.length}\n`;
    output += `- Roles: ${roles.length}\n`;

    // Output to console
    console.log(output);

    // Output to file
    const reportDir = path.join(process.cwd(), 'project-process/iam-reports');
    if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const fileName = `iam_audit_${new Date().toISOString().split('T')[0]}.md`;
    const filePath = path.join(reportDir, fileName);
    
    fs.writeFileSync(filePath, output);
    console.log(`\n✅ Audit report saved to: ${filePath}`);
}

audit().catch(console.error);
