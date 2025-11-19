/// Module: AccessControl
/// 权限管理与角色控制
module attenda::access_control {
    use sui::event;
    use sui::table::{Self, Table};

    /// 角色类型
    const ROLE_ADMIN: u8 = 0;
    const ROLE_VERIFIER: u8 = 2;

    /// 错误码
    const ERR_NOT_ADMIN: u64 = 4000;
    const ERR_INVALID_ROLE: u64 = 4001;

    /// 权限管理器（全局单例）
    public struct AccessControlCap has key {
        id: UID,
        admins: Table<address, bool>,
        verifiers: Table<address, bool>,
    }

    /// 角色授予事件
    public struct RoleGranted has copy, drop {
        role: u8,
        account: address,
        granted_by: address,
    }

    /// 角色撤销事件
    public struct RoleRevoked has copy, drop {
        role: u8,
        account: address,
        revoked_by: address,
    }

    /// 初始化权限管理器
    fun init(ctx: &mut TxContext) {
        let admins_table = table::new<address, bool>(ctx);
        let verifiers_table = table::new<address, bool>(ctx);
        
        let cap = AccessControlCap {
            id: sui::object::new(ctx),
            admins: admins_table,
            verifiers: verifiers_table,
        };

        // Note: 需要在初始化后通过单独的交易添加管理员
        sui::transfer::share_object(cap);
    }

    /// 授予角色
    public entry fun grant_role(
        cap: &mut AccessControlCap,
        role: u8,
        account: address,
        ctx: &mut TxContext
    ) {
        let sender = sui::tx_context::sender(ctx);
        assert!(is_admin_internal(cap, sender), ERR_NOT_ADMIN);
        assert!(role <= ROLE_VERIFIER, ERR_INVALID_ROLE);

        if (role == ROLE_ADMIN) {
            if (!table::contains(&cap.admins, account)) {
                table::add(&mut cap.admins, account, true);
            };
        } else if (role == ROLE_VERIFIER) {
            if (!table::contains(&cap.verifiers, account)) {
                table::add(&mut cap.verifiers, account, true);
            };
        };

        event::emit(RoleGranted {
            role,
            account,
            granted_by: sender,
        });
    }

    /// 撤销角色
    public entry fun revoke_role(
        cap: &mut AccessControlCap,
        role: u8,
        account: address,
        ctx: &mut TxContext
    ) {
        let sender = sui::tx_context::sender(ctx);
        assert!(is_admin_internal(cap, sender), ERR_NOT_ADMIN);
        assert!(role <= ROLE_VERIFIER, ERR_INVALID_ROLE);

        if (role == ROLE_ADMIN && table::contains(&cap.admins, account)) {
            table::remove(&mut cap.admins, account);
        } else if (role == ROLE_VERIFIER && table::contains(&cap.verifiers, account)) {
            table::remove(&mut cap.verifiers, account);
        };

        event::emit(RoleRevoked {
            role,
            account,
            revoked_by: sender,
        });
    }

    /// 检查是否为管理员
    public fun is_admin(cap: &AccessControlCap, account: address): bool {
        is_admin_internal(cap, account)
    }

    /// 检查是否为验证者
    public fun is_verifier(cap: &AccessControlCap, account: address): bool {
        table::contains(&cap.verifiers, account)
    }

    /// 内部函数：检查管理员权限
    fun is_admin_internal(cap: &AccessControlCap, account: address): bool {
        table::contains(&cap.admins, account)
    }
}
