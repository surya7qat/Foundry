from core.middleware import tenant_state

class TenantDatabaseRouter:
    """
    A persistent database router intercepting core Django ORM operations
    and directing model queries to specific isolated MySQL schemas according to thread context.
    """
    route_app_labels = {'inventory', 'purchases'} # Only modularize the Factory specific parameters

    def db_for_read(self, model, **hints):
        if model._meta.app_label in self.route_app_labels:
            db = getattr(tenant_state, 'db', 'default')
            print(f"--- [Router] Routing READ for {model._meta.model_name} to DB: {db} ---")
            return db
        return 'default'

    def db_for_write(self, model, **hints):
        if model._meta.app_label in self.route_app_labels:
            db = getattr(tenant_state, 'db', 'default')
            print(f"--- [Router] Routing WRITE for {model._meta.model_name} to DB: {db} ---")
            return db
        return 'default'

    def allow_relation(self, obj1, obj2, **hints):
        return True

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        if app_label in self.route_app_labels:
            return True
        # For accounts and authentication parameters, lock writes down to the Master DB exclusively
        if db == 'default':
            return True
        return False
