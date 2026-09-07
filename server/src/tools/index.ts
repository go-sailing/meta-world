import { GetTimeTool } from './builtins/get-time.js';
import { FileReadTool, FileWriteTool, FileListTool, FileDeleteTool } from './builtins/file-tools.js';
import { SendLetterTool } from './builtins/send-letter.js';
import { ListAddressBookTool } from './builtins/list-address-book.js';
import { PublishBlogTool } from './builtins/publish-blog.js';
import { ListBlogsTool } from './builtins/list-blogs.js';
import { ReadBlogTool } from './builtins/read-blog.js';
import { AddFriendTool } from './builtins/add-friend.js';
import { RemoveFriendTool } from './builtins/remove-friend.js';
import { toolRegistry } from './registry.js';

/** 启动时注册所有内置工具 */
export function registerAllTools() {
  toolRegistry.register(new GetTimeTool());
  toolRegistry.register(new FileReadTool());
  toolRegistry.register(new FileWriteTool());
  toolRegistry.register(new FileListTool());
  toolRegistry.register(new FileDeleteTool());
  toolRegistry.register(new SendLetterTool());
  toolRegistry.register(new ListAddressBookTool());
  // v0.6.0 新增：博客 + 社交工具
  toolRegistry.register(new PublishBlogTool());
  toolRegistry.register(new ListBlogsTool());
  toolRegistry.register(new ReadBlogTool());
  toolRegistry.register(new AddFriendTool());
  toolRegistry.register(new RemoveFriendTool());
}
