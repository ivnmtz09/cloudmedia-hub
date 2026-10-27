enum UserRole {
  viewer(1),
  moderator(2),
  admin(3);

  final int hierarchy;
  const UserRole(this.hierarchy);

  static UserRole fromString(String? roleStr) {
    switch (roleStr?.toLowerCase()) {
      case 'admin':
        return UserRole.admin;
      case 'moderator':
        return UserRole.moderator;
      default:
        return UserRole.viewer;
    }
  }

  bool get canAccessStorageQuotas => hierarchy >= UserRole.moderator.hierarchy;
  bool get canEnrichMetadata => hierarchy >= UserRole.moderator.hierarchy;
}

class UserModel {
  final String id;
  final String username;
  final UserRole role;
  final bool mustChangePassword;

  const UserModel({
    required this.id,
    required this.username,
    required this.role,
    required this.mustChangePassword,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id']?.toString() ?? '',
      username: json['username'] ?? '',
      role: UserRole.fromString(json['role'] as String?),
      mustChangePassword: json['mustChangePassword'] == true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'role': role.name,
      'mustChangePassword': mustChangePassword,
    };
  }
}
