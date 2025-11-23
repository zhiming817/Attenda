/// Module: TicketSeal
/// 基于 Seal 的门票加密访问控制
/// 参考 cotract-demo/move/sources/allowlist.move
module attenda::ticket_seal {
    use std::string::String;
    use sui::dynamic_field as df;
    use sui::event;

    /// 错误码
    const EInvalidCap: u64 = 0;
    const ENoAccess: u64 = 1;
    const EDuplicate: u64 = 2;
    const MARKER: u64 = 3;

    // ========== Events ==========

    /// 创建票据访问策略事件
    public struct TicketPolicyCreated has copy, drop {
        policy_id: ID,
        event_id: address,
        creator: address,
    }

    /// 添加持票人到访问列表事件
    public struct TicketHolderAdded has copy, drop {
        policy_id: ID,
        ticket_id: address,
        holder: address,
        operator: address,
    }

    /// 发布加密 Blob 事件
    public struct TicketBlobPublished has copy, drop {
        policy_id: ID,
        ticket_id: address,
        blob_id: String,
        publisher: address,
    }

    // ========== 核心结构 ==========

    /// 票据访问策略（类似 Allowlist）
    /// 每个活动有一个 TicketPolicy，管理所有门票的访问控制
    public struct TicketPolicy has key {
        id: UID,
        event_id: address,
        /// 存储 ticket_id -> holder_address 的映射
        tickets: vector<address>,
        holders: vector<address>,
    }

    /// 管理员权限 Cap
    public struct PolicyCap has key, store {
        id: UID,
        policy_id: ID,
    }

    // ========== 管理函数 ==========

    /// 创建票据访问策略（活动创建时调用）
    public fun create_policy(event_id: address, ctx: &mut TxContext): PolicyCap {
        let policy = TicketPolicy {
            id: object::new(ctx),
            event_id: event_id,
            tickets: vector::empty(),
            holders: vector::empty(),
        };
        let policy_id = object::id(&policy);
        
        let cap = PolicyCap {
            id: object::new(ctx),
            policy_id: policy_id,
        };
        
        // 发布事件
        event::emit(TicketPolicyCreated {
            policy_id: policy_id,
            event_id: event_id,
            creator: ctx.sender(),
        });
        
        transfer::share_object(policy);
        cap
    }

    /// 便捷入口函数：创建策略并发送给创建者
    public entry fun create_policy_entry(event_id: address, ctx: &mut TxContext) {
        let cap = create_policy(event_id, ctx);
        transfer::public_transfer(cap, ctx.sender());
    }

    /// 添加持票人（铸造门票时调用）
    public fun add_ticket_holder(
        policy: &mut TicketPolicy,
        cap: &PolicyCap,
        ticket_id: address,
        holder: address,
        ctx: &TxContext
    ) {
        assert!(cap.policy_id == object::id(policy), EInvalidCap);
        assert!(!policy.tickets.contains(&ticket_id), EDuplicate);
        
        policy.tickets.push_back(ticket_id);
        policy.holders.push_back(holder);
        
        // 发布事件
        event::emit(TicketHolderAdded {
            policy_id: object::id(policy),
            ticket_id: ticket_id,
            holder: holder,
            operator: ctx.sender(),
        });
    }

    /// 添加持票人（无需 PolicyCap，铸造门票时内部调用）
    public(package) fun add_ticket_holder_internal(
        policy: &mut TicketPolicy,
        ticket_id: address,
        holder: address,
        ctx: &TxContext
    ) {
        assert!(!policy.tickets.contains(&ticket_id), EDuplicate);
        
        policy.tickets.push_back(ticket_id);
        policy.holders.push_back(holder);
        
        // 发布事件
        event::emit(TicketHolderAdded {
            policy_id: object::id(policy),
            ticket_id: ticket_id,
            holder: holder,
            operator: ctx.sender(),
        });
    }

    /// 移除持票人（门票转让时调用）
    public fun remove_ticket_holder(
        policy: &mut TicketPolicy,
        cap: &PolicyCap,
        ticket_id: address,
    ) {
        assert!(cap.policy_id == object::id(policy), EInvalidCap);
        
        // 找到对应的索引并移除
        let len = policy.tickets.length();
        let mut i = 0;
        while (i < len) {
            if (*policy.tickets.borrow(i) == ticket_id) {
                policy.tickets.remove(i);
                policy.holders.remove(i);
                break
            };
            i = i + 1;
        };
    }

    // ========== Seal 访问控制 ==========

    /// 生成命名空间（用于 Seal 加密 ID 前缀）
    /// 格式：[policy_id]
    public fun namespace(policy: &TicketPolicy): vector<u8> {
        policy.id.to_bytes()
    }

    /// 检查是否有权限访问
    /// Seal 加密 ID 格式：[policy_id][ticket_id][nonce]
    fun approve_internal(caller: address, id: vector<u8>, policy: &TicketPolicy): bool {
        // 1. 检查 ID 是否有正确的前缀
        let namespace = namespace(policy);
        if (!is_prefix(namespace, id)) {
            return false
        };

        // 2. 检查调用者是否是持票人
        policy.holders.contains(&caller)
    }

    /// Seal 验证入口（客户端解密时调用）
    entry fun seal_approve(id: vector<u8>, policy: &TicketPolicy, ctx: &TxContext) {
        assert!(approve_internal(ctx.sender(), id, policy), ENoAccess);
    }

    /// 发布加密 Blob（将 Walrus blob_id 关联到策略）
    public fun publish_blob(
        policy: &mut TicketPolicy,
        cap: &PolicyCap,
        ticket_id: address,
        blob_id: String,
        ctx: &TxContext
    ) {
        assert!(cap.policy_id == object::id(policy), EInvalidCap);
        df::add(&mut policy.id, blob_id, MARKER);
        
        // 发布事件
        event::emit(TicketBlobPublished {
            policy_id: object::id(policy),
            ticket_id: ticket_id,
            blob_id: blob_id,
            publisher: ctx.sender(),
        });
    }

    // ========== 辅助函数 ==========

    /// 检查是否为前缀（参考 cotract-demo/move/sources/utils.move）
    fun is_prefix(prefix: vector<u8>, word: vector<u8>): bool {
        if (prefix.length() > word.length()) {
            return false
        };
        let mut i = 0;
        while (i < prefix.length()) {
            if (prefix[i] != word[i]) {
                return false
            };
            i = i + 1;
        };
        true
    }

    // ========== 只读访问器 ==========

    public fun get_event_id(policy: &TicketPolicy): address {
        policy.event_id
    }

    public fun ticket_count(policy: &TicketPolicy): u64 {
        policy.tickets.length()
    }

    public fun is_ticket_holder(policy: &TicketPolicy, holder: address): bool {
        policy.holders.contains(&holder)
    }

    public fun get_policy_id(cap: &PolicyCap): ID {
        cap.policy_id
    }

    // ========== 测试辅助 ==========

    #[test_only]
    public fun new_policy_for_testing(event_id: address, ctx: &mut TxContext): TicketPolicy {
        TicketPolicy {
            id: object::new(ctx),
            event_id: event_id,
            tickets: vector::empty(),
            holders: vector::empty(),
        }
    }

    #[test_only]
    public fun new_cap_for_testing(ctx: &mut TxContext, policy: &TicketPolicy): PolicyCap {
        PolicyCap {
            id: object::new(ctx),
            policy_id: object::id(policy),
        }
    }

    #[test_only]
    public fun destroy_for_testing(policy: TicketPolicy, cap: PolicyCap) {
        let TicketPolicy { id, .. } = policy;
        object::delete(id);
        let PolicyCap { id, .. } = cap;
        object::delete(id);
    }
}
