from app.models.base import UUIDBase
class Brand(UUIDBase): __tablename__="brands"
class Product(UUIDBase): __tablename__="products"
class Audience(UUIDBase): __tablename__="audiences"
